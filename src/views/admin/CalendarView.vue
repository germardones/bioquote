<template>
  <div class="calendar-page fade-in">
    <div class="page-header">
      <button @click="router.back()" class="btn-back">
        <i class="fa-solid fa-arrow-left"></i> Volver
      </button>
      <h2>Agenda</h2>
      <div class="view-toggle">
        <button :class="{ active: view === 'month' }" @click="view = 'month'">Mes</button>
        <button :class="{ active: view === 'week' }" @click="view = 'week'">Semana</button>
      </div>
    </div>

    <!-- Layer toggles -->
    <div class="layers">
      <label v-for="l in layers" :key="l.id" class="layer-chip" :class="{ active: activeLayers[l.id] }">
        <input type="checkbox" v-model="activeLayers[l.id]" />
        <span class="dot" :style="{ background: l.color }"></span>
        {{ l.label }}
      </label>
    </div>

    <div class="cal-nav">
      <button @click="nav(-1)" class="nav-btn"><i class="fa-solid fa-chevron-left"></i></button>
      <h3>{{ periodLabel }}</h3>
      <button @click="nav(1)" class="nav-btn"><i class="fa-solid fa-chevron-right"></i></button>
      <button @click="goToday" class="today-btn">Hoy</button>
    </div>

    <!-- Month view -->
    <div v-if="view === 'month'" class="cal-grid month">
      <div v-for="d in dayLabels" :key="'h'+d" class="cal-head">{{ d }}</div>
      <div
        v-for="cell in monthCells" :key="cell.key"
        class="cal-cell"
        :class="{ 'other-month': !cell.inMonth, 'today': cell.isToday }"
      >
        <div class="cal-date">{{ cell.day }}</div>
        <div class="cell-events">
          <div
            v-for="ev in cell.events" :key="ev.key"
            class="event-pill"
            :style="{ background: ev.color + '22', color: ev.color, borderLeft: `3px solid ${ev.color}` }"
            :title="ev.tooltip"
            @click="onEventClick(ev)"
          >
            <i :class="'fa-solid ' + ev.icon"></i>
            {{ ev.label }}
          </div>
        </div>
      </div>
    </div>

    <!-- Week view -->
    <div v-else class="week-view">
      <div class="week-grid">
        <div v-for="d in weekCells" :key="d.key" class="week-day" :class="{ today: d.isToday }">
          <div class="wd-head">
            <div class="wd-day-name">{{ dayLabels[d.dow] }}</div>
            <div class="wd-day-num">{{ d.day }}</div>
          </div>
          <div class="wd-body">
            <div
              v-for="ev in d.events" :key="ev.key"
              class="event-pill"
              :style="{ background: ev.color + '22', color: ev.color, borderLeft: `3px solid ${ev.color}` }"
              :title="ev.tooltip"
              @click="onEventClick(ev)"
            >
              <i :class="'fa-solid ' + ev.icon"></i>
              {{ ev.label }}
            </div>
            <div v-if="d.events.length === 0" class="wd-empty">—</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legacy ActionCalendar (manual events `eventos` collection) — lazy-mounted -->
    <details class="legacy-wrap" @toggle="onLegacyToggle">
      <summary>📋 Eventos manuales (calendario clásico)</summary>
      <div class="legacy-body" v-if="showLegacy">
        <ActionCalendar />
      </div>
    </details>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { db, auth } from '../../firebase/firebaseConfig'
import { collection, query, where, getDocs } from 'firebase/firestore'
import ActionCalendar from '../../components/dashboard/ActionCalendar.vue'
import { useTasksStore } from '../../store/tasks'
import { useAbsencesStore } from '../../store/absences'
import { ABSENCE_STATUS, absenceMeta } from '../../constants/employee'
import { STATUS } from '../../constants/projectStatus'

const router = useRouter()
const tasksStore = useTasksStore()
const absencesStore = useAbsencesStore()

const view = ref('month')
const current = ref(new Date())
const projects = ref([])
const showLegacy = ref(false)
const onLegacyToggle = (e) => { showLegacy.value = e.target.open }

const layers = [
  { id: 'milestones', label: 'Hitos', color: '#8b5cf6' },
  { id: 'tasks',      label: 'Tareas', color: '#3b82f6' },
  { id: 'absences',   label: 'Ausencias', color: '#f59e0b' }
]
const activeLayers = reactive({ milestones: true, tasks: true, absences: true })

const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

onMounted(async () => {
  const user = auth.currentUser
  if (user) {
    const pSnap = await getDocs(query(collection(db, 'projects'), where('owner_uid', '==', user.uid)))
    projects.value = pSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  }
  await Promise.all([tasksStore.fetchAll(), absencesStore.fetchAll()])
})

const periodLabel = computed(() => {
  const names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return `${names[current.value.getMonth()]} ${current.value.getFullYear()}`
})

const nav = (n) => {
  const d = new Date(current.value)
  if (view.value === 'month') d.setMonth(d.getMonth() + n)
  else d.setDate(d.getDate() + 7 * n)
  current.value = d
}
const goToday = () => { current.value = new Date() }

// Build event list (merged from milestones + tasks + absences)
const allEvents = computed(() => {
  const events = []

  if (activeLayers.milestones) {
    for (const p of projects.value) {
      if (p.status !== STATUS.EN_CURSO && p.status !== STATUS.APPROVED) continue
      for (const m of (p.milestones || [])) {
        if (!m.dueDate || m.done) continue
        events.push({
          key: `m-${p.id}-${m.id}`,
          date: m.dueDate,
          label: `${p.client_name}: ${m.title}`,
          color: '#8b5cf6',
          icon: 'fa-flag-checkered',
          tooltip: `Hito ${p.client_name}: ${m.title}`,
          link: `/proyectos/${p.id}`
        })
      }
    }
  }

  if (activeLayers.tasks) {
    for (const t of tasksStore.items) {
      if (!t.dueDate || t.status === 'Completada') continue
      events.push({
        key: `t-${t.id}`,
        date: t.dueDate,
        label: t.title,
        color: '#3b82f6',
        icon: 'fa-list-check',
        tooltip: `Tarea: ${t.title}${t.assignedToName ? ' (' + t.assignedToName + ')' : ''}`,
        link: '/tareas'
      })
    }
  }

  if (activeLayers.absences) {
    for (const a of absencesStore.items) {
      if (a.status !== ABSENCE_STATUS.APPROVED) continue
      // expand range
      const start = new Date(a.startDate + 'T00:00:00')
      const end = new Date(a.endDate + 'T00:00:00')
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().slice(0, 10)
        const meta = absenceMeta(a.type)
        events.push({
          key: `a-${a.id}-${iso}`,
          date: iso,
          label: a.workerName,
          color: meta.color,
          icon: meta.icon,
          tooltip: `${a.workerName} — ${meta.label}`,
          link: '/equipo/ausencias'
        })
      }
    }
  }

  return events
})

const eventsByDate = computed(() => {
  const map = {}
  for (const ev of allEvents.value) {
    if (!map[ev.date]) map[ev.date] = []
    map[ev.date].push(ev)
  }
  return map
})

const monthCells = computed(() => {
  const year = current.value.getFullYear()
  const month = current.value.getMonth()
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  const todayKey = new Date().toISOString().slice(0, 10)
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    cells.push({
      key,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: key === todayKey,
      events: eventsByDate.value[key] || []
    })
  }
  return cells
})

const weekCells = computed(() => {
  const today = new Date(current.value)
  const offset = (today.getDay() + 6) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - offset)
  const todayKey = new Date().toISOString().slice(0, 10)
  const cells = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    cells.push({
      key,
      day: d.getDate(),
      dow: i,
      isToday: key === todayKey,
      events: eventsByDate.value[key] || []
    })
  }
  return cells
})

const onEventClick = (ev) => { if (ev.link) router.push(ev.link) }
</script>

<style scoped>
.calendar-page { padding: 2rem; max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.page-header h2 { margin: 0; font-size: 1.7rem; color: var(--text-main); flex: 1; }
.btn-back { background: none; border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; gap: 8px; }

.view-toggle { display: inline-flex; background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 8px; padding: 2px; }
.view-toggle button { background: transparent; border: none; padding: 8px 16px; color: var(--text-muted); cursor: pointer; border-radius: 6px; font-weight: 600; }
.view-toggle button.active { background: var(--primary); color: white; }

.layers { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 1rem; }
.layer-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; background: var(--bg-surface); border: 1px solid var(--border-color); cursor: pointer; user-select: none; font-size: 0.85rem; color: var(--text-muted); }
.layer-chip input { display: none; }
.layer-chip.active { color: var(--text-main); border-color: var(--primary); }
.layer-chip .dot { width: 10px; height: 10px; border-radius: 50%; }

.cal-nav { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
.cal-nav h3 { margin: 0; color: var(--text-main); flex: 1; text-align: center; }
.nav-btn { background: var(--bg-app); border: 1px solid var(--border-color); width: 34px; height: 34px; border-radius: 8px; cursor: pointer; color: var(--text-main); }
.today-btn { background: var(--primary); color: white; border: none; padding: 7px 14px; border-radius: 8px; cursor: pointer; font-weight: 600; }

.cal-grid.month { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal-head { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; padding: 6px; text-align: center; }
.cal-cell { min-height: 100px; background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 6px; padding: 4px; display: flex; flex-direction: column; gap: 4px; }
.cal-cell.other-month { opacity: 0.4; }
.cal-cell.today { border-color: var(--primary); background: rgba(0,131,102,0.08); }
.cal-date { font-size: 0.78rem; font-weight: 700; color: var(--text-main); }
.cell-events { display: flex; flex-direction: column; gap: 2px; }
.event-pill { font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px; }
.event-pill:hover { transform: translateX(2px); }

.week-view { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; }
.week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.week-day { background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 8px; min-height: 240px; padding: 0.5rem; display: flex; flex-direction: column; }
.week-day.today { border-color: var(--primary); background: rgba(0,131,102,0.08); }
.wd-head { text-align: center; padding-bottom: 6px; border-bottom: 1px solid var(--border-color); margin-bottom: 6px; }
.wd-day-name { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; }
.wd-day-num { font-size: 1.4rem; font-weight: 800; color: var(--text-main); }
.wd-body { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.wd-empty { color: var(--text-muted); font-style: italic; text-align: center; padding-top: 1rem; font-size: 0.8rem; }

.legacy-wrap { margin-top: 2rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; }
.legacy-wrap summary { cursor: pointer; font-weight: 600; color: var(--text-main); padding: 0.5rem 0; }
.legacy-body { padding-top: 1rem; }

@media (max-width: 900px) {
  .week-grid { grid-template-columns: 1fr; }
  .cal-cell { min-height: 70px; }
}
@media (max-width: 640px) {
  .calendar-page { padding: 1rem; }
}
</style>
