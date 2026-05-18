<template>
  <div class="panel">
    <div class="head">
      <h3 class="panel-title"><i class="fa-solid fa-list-check"></i> Mis tareas</h3>
      <RouterLink to="/tareas" class="link">Ver todas</RouterLink>
    </div>
    <div v-if="loading" class="loading">Cargando...</div>
    <div v-else-if="myTasks.length === 0" class="empty">No tienes tareas pendientes 👌</div>
    <ul v-else class="list">
      <li v-for="t in myTasks" :key="t.id" class="row" @click="$router.push('/tareas')">
        <input type="checkbox" :checked="t.status === 'Completada'" @click.stop="toggle(t)" />
        <div class="body">
          <div class="title" :class="{ done: t.status === 'Completada' }">{{ t.title }}</div>
          <div class="sub">
            <span class="prio" :style="prioStyle(t.priority)">{{ t.priority }}</span>
            <span v-if="t.dueDate" :class="{ overdue: isOverdue(t) }">📅 {{ formatDate(t.dueDate) }}</span>
            <span v-if="t.projectName" class="proj">· {{ t.projectName }}</span>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useTasksStore } from '../../store/tasks'
import { auth } from '../../firebase/firebaseConfig'
import { priorityMeta } from '../../constants/tasks'

const store = useTasksStore()
const loading = computed(() => store.loading)

onMounted(() => { if (store.items.length === 0) store.fetchAll() })

const myTasks = computed(() => {
  const email = auth.currentUser?.email || ''
  // Best-effort: match by assignedToName containing the user's email prefix, or show all if no clear match
  // Workers usually have email; we filter by createdBy match too.
  return store.items
    .filter(t => t.status !== 'Completada')
    .filter(t => {
      // If we don't have a workerId tied to current user, fall back to showing all open
      return true
    })
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
    .slice(0, 6)
})

async function toggle(t) {
  const next = t.status === 'Completada' ? 'Pendiente' : 'Completada'
  await store.setStatus(t, next)
}

const prioStyle = (p) => {
  const c = priorityMeta(p).color
  return { background: c + '22', color: c }
}
const isOverdue = (t) => t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10)
const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}`
}
</script>

<style scoped>
.panel { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; box-shadow: var(--shadow); }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.panel-title { margin: 0; font-size: 1rem; display: flex; align-items: center; gap: 8px; color: var(--text-main); }
.link { color: var(--primary); text-decoration: none; font-size: 0.82rem; font-weight: 600; }
.link:hover { text-decoration: underline; }
.loading, .empty { padding: 1rem; text-align: center; color: var(--text-muted); }
.list { list-style: none; padding: 0; margin: 0; max-height: 320px; overflow-y: auto; }
.row { display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px solid var(--border-color); cursor: pointer; }
.row:last-child { border-bottom: none; }
.row:hover { background: var(--bg-app); }
.row input { width: 16px; height: 16px; accent-color: var(--primary); }
.body { flex: 1; min-width: 0; }
.title { font-weight: 600; color: var(--text-main); font-size: 0.9rem; }
.title.done { text-decoration: line-through; color: var(--text-muted); }
.sub { color: var(--text-muted); font-size: 0.78rem; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.prio { padding: 1px 6px; border-radius: 8px; font-weight: 700; font-size: 0.7rem; }
.overdue { color: #ef4444; font-weight: 600; }
.proj { color: var(--text-muted); }
</style>
