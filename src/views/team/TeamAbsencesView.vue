<template>
  <div class="container">
    <div class="header">
      <h2>Ausencias y Vacaciones</h2>
      <div class="actions">
        <button @click="showRequest = true" class="btn-primary">
          <i class="fa-solid fa-plus"></i> Solicitar
        </button>
        <button @click="router.push('/usuarios')" class="btn-secondary">
          <i class="fa-solid fa-users"></i> Colaboradores
        </button>
        <button @click="router.push('/dashboard')" class="btn-volver">Volver</button>
      </div>
    </div>

    <!-- Summary -->
    <div class="summary-grid">
      <div class="sum-card">
        <div class="sum-icon" style="background:rgba(245,158,11,0.12);color:#f59e0b;">
          <i class="fa-solid fa-hourglass-half"></i>
        </div>
        <div>
          <label>Pendientes</label>
          <span class="value">{{ absencesStore.pendingCount }}</span>
        </div>
      </div>
      <div class="sum-card">
        <div class="sum-icon" style="background:rgba(34,197,94,0.12);color:#16a34a;">
          <i class="fa-solid fa-check"></i>
        </div>
        <div>
          <label>Aprobadas este mes</label>
          <span class="value">{{ approvedThisMonth }}</span>
        </div>
      </div>
      <div class="sum-card">
        <div class="sum-icon" style="background:rgba(59,130,246,0.12);color:#3b82f6;">
          <i class="fa-solid fa-users"></i>
        </div>
        <div>
          <label>Colaboradores ausentes hoy</label>
          <span class="value">{{ absentToday }}</span>
        </div>
      </div>
    </div>

    <!-- Calendar -->
    <div class="panel">
      <div class="cal-nav">
        <button @click="navMonth(-1)" class="nav-btn"><i class="fa-solid fa-chevron-left"></i></button>
        <h3>{{ monthLabel }}</h3>
        <button @click="navMonth(1)" class="nav-btn"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div class="cal-grid">
        <div v-for="d in dayLabels" :key="d" class="cal-head">{{ d }}</div>
        <div
          v-for="cell in calendarCells" :key="cell.key"
          class="cal-cell"
          :class="{ 'other-month': !cell.inMonth, 'today': cell.isToday }"
        >
          <div class="cal-date">{{ cell.day }}</div>
          <div v-for="a in cell.absences" :key="a.id" class="cal-pill" :style="pillStyle(a)" :title="absenceTooltip(a)">
            <i :class="'fa-solid ' + absenceMeta(a.type).icon"></i>
            {{ a.workerName }}
          </div>
        </div>
      </div>
    </div>

    <!-- List -->
    <div class="panel">
      <h3 class="panel-title"><i class="fa-solid fa-list"></i> Solicitudes y registros</h3>
      <div v-if="absencesStore.loading" class="loading">Cargando...</div>
      <div v-else-if="absencesStore.items.length === 0" class="empty">Sin ausencias registradas.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Tipo</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th class="r">Días</th>
              <th>Motivo</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in absencesStore.items" :key="a.id">
              <td>{{ a.workerName }}</td>
              <td>
                <span class="cat-pill" :style="{ background: absenceMeta(a.type).color + '22', color: absenceMeta(a.type).color }">
                  <i :class="'fa-solid ' + absenceMeta(a.type).icon"></i>
                  {{ absenceMeta(a.type).label }}
                </span>
              </td>
              <td>{{ formatDate(a.startDate) }}</td>
              <td>{{ formatDate(a.endDate) }}</td>
              <td class="r">{{ a.days }}</td>
              <td class="reason">{{ a.reason || '—' }}</td>
              <td>
                <span class="badge" :class="statusClass(a.status)">{{ a.status }}</span>
              </td>
              <td class="actions-cell">
                <template v-if="a.status === 'Pendiente'">
                  <button class="btn-approve" @click="setStatus(a, 'Aprobada')" title="Aprobar">
                    <i class="fa-solid fa-check"></i>
                  </button>
                  <button class="btn-reject" @click="setStatus(a, 'Rechazada')" title="Rechazar">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </template>
                <button class="btn-del" @click="onDelete(a)" title="Eliminar">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Request modal -->
    <div v-if="showRequest" class="modal-overlay" @click.self="showRequest = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fa-solid fa-paper-plane"></i> Solicitar ausencia</h3>
          <button class="close-btn" @click="showRequest = false">&times;</button>
        </div>
        <form @submit.prevent="submitRequest" class="form">
          <div class="form-group">
            <label>Colaborador</label>
            <select v-model="form.workerId" required>
              <option value="">Selecciona...</option>
              <option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Tipo</label>
            <select v-model="form.type" required>
              <option v-for="t in ABSENCE_TYPES" :key="t.id" :value="t.id">{{ t.label }}</option>
            </select>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Inicio</label>
              <input type="date" v-model="form.startDate" required />
            </div>
            <div class="form-group">
              <label>Fin</label>
              <input type="date" v-model="form.endDate" required />
            </div>
          </div>
          <div class="form-group">
            <label>Motivo (opcional)</label>
            <input type="text" v-model="form.reason" placeholder="Vacaciones de fin de año..." />
          </div>
          <div v-if="computedDays > 0" class="days-preview">
            Total: <strong>{{ computedDays }}</strong> día(s)
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showRequest = false">Cancelar</button>
            <button type="submit" class="btn-save">Enviar solicitud</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../../firebase/firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'
import { useAbsencesStore } from '../../store/absences'
import { ABSENCE_TYPES, ABSENCE_STATUS, absenceMeta, daysBetween } from '../../constants/employee'

const router = useRouter()
const absencesStore = useAbsencesStore()
const workers = ref([])
const showRequest = ref(false)

const today = new Date()
const currentMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))

const form = reactive({
  workerId: '', type: 'vacaciones',
  startDate: today.toISOString().slice(0, 10),
  endDate: today.toISOString().slice(0, 10),
  reason: ''
})

onMounted(async () => {
  await Promise.all([fetchWorkers(), absencesStore.fetchAll()])
})

async function fetchWorkers() {
  const snap = await getDocs(collection(db, 'workers'))
  workers.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

const computedDays = computed(() => daysBetween(form.startDate, form.endDate))

async function submitRequest() {
  if (!form.workerId) return
  const worker = workers.value.find(w => w.id === form.workerId)
  try {
    await absencesStore.request({
      workerId: form.workerId,
      workerName: worker?.name || 'Desconocido',
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason
    })
    showRequest.value = false
    Object.assign(form, { workerId: '', type: 'vacaciones', reason: '' })
  } catch (e) {
    console.error(e); alert('Error al enviar solicitud.')
  }
}

async function setStatus(a, status) {
  if (!confirm(`¿${status === 'Aprobada' ? 'Aprobar' : 'Rechazar'} esta solicitud?`)) return
  try { await absencesStore.setStatus(a, status) }
  catch (e) { console.error(e); alert('Error al actualizar.') }
}

async function onDelete(a) {
  if (!confirm(`¿Eliminar registro de ${a.workerName}?`)) return
  try { await absencesStore.remove(a) }
  catch (e) { console.error(e); alert('Error al eliminar.') }
}

// ----- Calendar logic -----
const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const monthLabel = computed(() => {
  const names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return `${names[currentMonth.value.getMonth()]} ${currentMonth.value.getFullYear()}`
})

const navMonth = (n) => {
  const d = new Date(currentMonth.value)
  d.setMonth(d.getMonth() + n)
  currentMonth.value = d
}

const calendarCells = computed(() => {
  const cells = []
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const first = new Date(year, month, 1)
  // Monday-first index
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  const todayKey = new Date().toISOString().slice(0, 10)
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const dayAbs = absencesStore.items.filter(a =>
      a.status === ABSENCE_STATUS.APPROVED &&
      a.startDate <= key && a.endDate >= key
    )
    cells.push({
      key,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: key === todayKey,
      absences: dayAbs
    })
  }
  return cells
})

const approvedThisMonth = computed(() => {
  const ym = new Date().toISOString().slice(0, 7)
  return absencesStore.items.filter(a => a.status === ABSENCE_STATUS.APPROVED && a.startDate?.startsWith(ym)).length
})

const absentToday = computed(() => {
  const t = new Date().toISOString().slice(0, 10)
  const ids = new Set()
  absencesStore.items.forEach(a => {
    if (a.status === ABSENCE_STATUS.APPROVED && a.startDate <= t && a.endDate >= t) ids.add(a.workerId)
  })
  return ids.size
})

const pillStyle = (a) => {
  const c = absenceMeta(a.type).color
  return { background: c + '22', color: c, borderLeft: `3px solid ${c}` }
}
const absenceTooltip = (a) => `${a.workerName} — ${absenceMeta(a.type).label} (${formatDate(a.startDate)} → ${formatDate(a.endDate)})`

const statusClass = (s) => ({
  'Pendiente': 'pending',
  'Aprobada': 'approved',
  'Rechazada': 'rejected'
}[s] || '')

const formatDate = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}
</script>

<style scoped>
.container { max-width: 1300px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.btn-primary { background: var(--primary); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.btn-secondary { background: var(--bg-surface); color: var(--text-main); border: 1px solid var(--border-color); padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }

.summary-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 1.5rem; }
.sum-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.2rem; display: flex; gap: 1rem; align-items: center; box-shadow: var(--shadow); }
.sum-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.sum-card label { display: block; font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
.sum-card .value { font-size: 1.4rem; font-weight: 800; color: var(--text-main); }

.panel { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow); margin-bottom: 1.5rem; }
.panel-title { margin: 0 0 1rem 0; display: flex; align-items: center; gap: 8px; color: var(--text-main); font-size: 1rem; }

.cal-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.cal-nav h3 { margin: 0; color: var(--text-main); }
.nav-btn { background: var(--bg-app); border: 1px solid var(--border-color); width: 34px; height: 34px; border-radius: 8px; cursor: pointer; color: var(--text-main); }

.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal-head { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; padding: 6px; text-align: center; }
.cal-cell { min-height: 90px; background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 6px; padding: 4px; display: flex; flex-direction: column; gap: 2px; }
.cal-cell.other-month { opacity: 0.4; }
.cal-cell.today { border-color: var(--primary); background: rgba(0,131,102,0.08); }
.cal-date { font-size: 0.78rem; font-weight: 700; color: var(--text-main); }
.cal-pill { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 800px; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border-color); color: var(--text-main); font-size: 0.9rem; }
th { background: var(--bg-app); color: var(--text-muted); text-transform: uppercase; font-size: 0.75rem; }
.r { text-align: right; }
.reason { color: var(--text-muted); }
.cat-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }

.badge { padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
.badge.pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
.badge.approved { background: rgba(34,197,94,0.15); color: #16a34a; }
.badge.rejected { background: rgba(239,68,68,0.15); color: #ef4444; }

.actions-cell { display: flex; gap: 4px; }
.btn-approve, .btn-reject, .btn-del { width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.btn-approve { background: rgba(34,197,94,0.12); color: #16a34a; border-color: rgba(34,197,94,0.3); }
.btn-reject { background: rgba(239,68,68,0.12); color: #ef4444; border-color: rgba(239,68,68,0.3); }
.btn-del { background: rgba(100,116,139,0.1); color: var(--text-muted); }
.btn-del:hover { color: #ef4444; }

.loading, .empty { text-align: center; padding: 2rem; color: var(--text-muted); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.modal-content { background: var(--bg-surface); width: 92%; max-width: 520px; border-radius: 12px; overflow: hidden; }
.modal-header { background: var(--bg-app); padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); }
.modal-header h3 { margin: 0; font-size: 1.05rem; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
.form { padding: 1.5rem; }
.form-group { margin-bottom: 0.75rem; }
.form-group label { display: block; margin-bottom: 4px; font-size: 0.82rem; color: var(--text-muted); font-weight: 600; }
.form-group input, .form-group select { width: 100%; padding: 9px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.days-preview { background: rgba(0,131,102,0.08); border: 1px solid rgba(0,131,102,0.3); padding: 8px 12px; border-radius: 6px; color: var(--text-main); margin-top: 0.5rem; font-size: 0.9rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 1rem; }
.btn-save { background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; }
.btn-cancel { background: var(--bg-app); color: var(--text-main); border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 6px; cursor: pointer; }

@media (max-width: 700px) {
  .container { padding: 1rem; }
  .header { flex-direction: column; align-items: stretch; }
  .cal-cell { min-height: 60px; padding: 2px; }
  .cal-pill { font-size: 0.65rem; }
  .grid-2 { grid-template-columns: 1fr; }
}
</style>
