<template>
  <div class="container">
    <div class="header">
      <h2>Tareas Internas</h2>
      <div class="actions">
        <button class="btn-primary" @click="openCreate"><i class="fa-solid fa-plus"></i> Nueva tarea</button>
        <button @click="router.push('/dashboard')" class="btn-volver">Volver</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="filter-group">
        <label>Responsable</label>
        <select v-model="filterAssignee">
          <option value="">Todos</option>
          <option value="__unassigned">Sin asignar</option>
          <option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Proyecto</label>
        <select v-model="filterProject">
          <option value="">Todos</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Prioridad</label>
        <select v-model="filterPriority">
          <option value="">Todas</option>
          <option v-for="p in TASK_PRIORITIES" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Vista</label>
        <div class="view-toggle">
          <button :class="{ active: view === 'kanban' }" @click="view = 'kanban'"><i class="fa-solid fa-table-columns"></i></button>
          <button :class="{ active: view === 'list' }" @click="view = 'list'"><i class="fa-solid fa-list"></i></button>
        </div>
      </div>
    </div>

    <div v-if="store.loading" class="loading">Cargando tareas...</div>

    <!-- KANBAN -->
    <div v-else-if="view === 'kanban'" class="kanban">
      <div
        v-for="col in TASK_STATUS_LIST"
        :key="col.id"
        class="kcol"
        :style="{ '--col-color': col.color }"
        @dragover.prevent="dragCol = col.id"
        @drop="onDrop(col.id)"
        :class="{ 'drop-target': dragCol === col.id }"
      >
        <div class="kcol-head">
          <span class="kcol-dot"></span>
          <h4>{{ col.label }}</h4>
          <span class="kcol-count">{{ grouped[col.id].length }}</span>
        </div>
        <div class="kcol-body">
          <div
            v-for="t in grouped[col.id]" :key="t.id"
            class="kcard"
            draggable="true"
            @dragstart="dragging = t"
            @dragend="dragging = null; dragCol = null"
            @click="openEdit(t)"
          >
            <div class="kcard-top">
              <span class="prio-pill" :style="prioStyle(t.priority)">
                <i :class="'fa-solid ' + priorityMeta(t.priority).icon"></i>
                {{ priorityMeta(t.priority).label }}
              </span>
              <span v-if="t.dueDate" class="due-pill" :class="{ overdue: isOverdue(t) }">
                <i class="fa-solid fa-clock"></i> {{ formatDate(t.dueDate) }}
              </span>
            </div>
            <div class="kcard-title">{{ t.title }}</div>
            <div v-if="t.description" class="kcard-desc">{{ t.description }}</div>
            <div class="kcard-meta">
              <span v-if="t.assignedToName" class="meta-chip"><i class="fa-solid fa-user"></i> {{ t.assignedToName }}</span>
              <span v-if="t.projectName" class="meta-chip"><i class="fa-solid fa-folder"></i> {{ t.projectName }}</span>
            </div>
          </div>
          <div v-if="grouped[col.id].length === 0" class="kcol-empty">Sin tareas</div>
        </div>
      </div>
    </div>

    <!-- LIST -->
    <div v-else class="list-wrap">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Título</th>
            <th>Responsable</th>
            <th>Proyecto</th>
            <th>Prioridad</th>
            <th>Vence</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in filtered" :key="t.id">
            <td>
              <input type="checkbox"
                :checked="t.status === 'Completada'"
                @change="toggleComplete(t)" />
            </td>
            <td>
              <div class="t-title" :class="{ done: t.status === 'Completada' }">{{ t.title }}</div>
              <div v-if="t.description" class="t-desc">{{ t.description }}</div>
            </td>
            <td>{{ t.assignedToName || '—' }}</td>
            <td>{{ t.projectName || '—' }}</td>
            <td>
              <span class="prio-pill" :style="prioStyle(t.priority)">
                {{ priorityMeta(t.priority).label }}
              </span>
            </td>
            <td :class="{ overdue: isOverdue(t) }">{{ formatDate(t.dueDate) || '—' }}</td>
            <td>
              <span class="status-pill" :style="statusStyle(t.status)">{{ statusMeta(t.status).label }}</span>
            </td>
            <td>
              <button class="btn-i" @click="openEdit(t)" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
              <button class="btn-i del" @click="onDelete(t)" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filtered.length === 0" class="empty">Sin tareas que coincidan con el filtro.</div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editing ? 'Editar tarea' : 'Nueva tarea' }}</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        <form @submit.prevent="submit" class="form">
          <div class="form-group">
            <label>Título</label>
            <input v-model="form.title" type="text" required placeholder="Ej: Revisar diseño landing" />
          </div>
          <div class="form-group">
            <label>Descripción</label>
            <textarea v-model="form.description" rows="3" placeholder="Detalles opcionales..."></textarea>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Responsable</label>
              <select v-model="form.assignedTo">
                <option value="">Sin asignar</option>
                <option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Proyecto</label>
              <select v-model="form.projectId">
                <option value="">Sin proyecto</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Prioridad</label>
              <select v-model="form.priority">
                <option v-for="p in TASK_PRIORITIES" :key="p.id" :value="p.id">{{ p.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Fecha límite</label>
              <input v-model="form.dueDate" type="date" />
            </div>
          </div>
          <div v-if="editing" class="form-group">
            <label>Estado</label>
            <select v-model="form.status">
              <option v-for="s in TASK_STATUS_LIST" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
          </div>
          <div class="modal-actions">
            <button v-if="editing" type="button" class="btn-del" @click="onDelete(editing)"><i class="fa-solid fa-trash"></i> Eliminar</button>
            <button type="button" class="btn-cancel" @click="closeModal">Cancelar</button>
            <button type="submit" class="btn-save">{{ editing ? 'Guardar' : 'Crear' }}</button>
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
import { useTasksStore } from '../../store/tasks'
import { TASK_STATUS_LIST, TASK_PRIORITIES, TASK_STATUS, priorityMeta, statusMeta } from '../../constants/tasks'

const router = useRouter()
const store = useTasksStore()
const workers = ref([])
const projects = ref([])

const filterAssignee = ref('')
const filterProject = ref('')
const filterPriority = ref('')
const view = ref(localStorage.getItem('tasksView') || 'kanban')
import { watch } from 'vue'
watch(view, v => localStorage.setItem('tasksView', v))

const showModal = ref(false)
const editing = ref(null)
const form = reactive({
  title: '', description: '',
  assignedTo: '', projectId: '',
  priority: 'Media', dueDate: '',
  status: TASK_STATUS.PENDIENTE
})

const dragging = ref(null)
const dragCol = ref(null)

onMounted(async () => {
  await store.fetchAll()
  const [wSnap, pSnap] = await Promise.all([
    getDocs(collection(db, 'workers')),
    getDocs(collection(db, 'projects'))
  ])
  workers.value = wSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  projects.value = pSnap.docs.map(d => ({ id: d.id, ...d.data() }))
})

const filtered = computed(() => store.items.filter(t => {
  if (filterAssignee.value === '__unassigned' && t.assignedTo) return false
  if (filterAssignee.value && filterAssignee.value !== '__unassigned' && t.assignedTo !== filterAssignee.value) return false
  if (filterProject.value && t.projectId !== filterProject.value) return false
  if (filterPriority.value && t.priority !== filterPriority.value) return false
  return true
}))

const grouped = computed(() => ({
  Pendiente: filtered.value.filter(t => t.status === 'Pendiente'),
  EnProgreso: filtered.value.filter(t => t.status === 'EnProgreso'),
  Completada: filtered.value.filter(t => t.status === 'Completada')
}))

function openCreate() {
  editing.value = null
  Object.assign(form, { title: '', description: '', assignedTo: '', projectId: '', priority: 'Media', dueDate: '', status: TASK_STATUS.PENDIENTE })
  showModal.value = true
}
function openEdit(t) {
  editing.value = t
  Object.assign(form, {
    title: t.title || '', description: t.description || '',
    assignedTo: t.assignedTo || '', projectId: t.projectId || '',
    priority: t.priority || 'Media', dueDate: t.dueDate || '',
    status: t.status || TASK_STATUS.PENDIENTE
  })
  showModal.value = true
}
function closeModal() { showModal.value = false; editing.value = null }

async function submit() {
  const worker = workers.value.find(w => w.id === form.assignedTo)
  const project = projects.value.find(p => p.id === form.projectId)
  const payload = {
    ...form,
    assignedToName: worker?.name || '',
    projectName: project?.name || ''
  }
  try {
    if (editing.value) {
      await store.update(editing.value, payload)
    } else {
      await store.create(payload)
    }
    closeModal()
  } catch (e) {
    console.error(e); alert('Error al guardar la tarea.')
  }
}

async function toggleComplete(t) {
  const next = t.status === 'Completada' ? 'Pendiente' : 'Completada'
  await store.setStatus(t, next)
}

async function onDelete(t) {
  if (!confirm(`¿Eliminar "${t.title}"?`)) return
  await store.remove(t)
  closeModal()
}

async function onDrop(colId) {
  const t = dragging.value
  dragging.value = null; dragCol.value = null
  if (!t || t.status === colId) return
  await store.setStatus(t, colId)
}

const prioStyle = (p) => {
  const c = priorityMeta(p).color
  return { background: c + '22', color: c }
}
const statusStyle = (s) => {
  const c = statusMeta(s).color
  return { background: c + '22', color: c }
}
const isOverdue = (t) => {
  if (!t.dueDate || t.status === 'Completada') return false
  return t.dueDate < new Date().toISOString().slice(0, 10)
}
const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}
</script>

<style scoped>
.container { max-width: 1300px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.actions { display: flex; gap: 0.5rem; }
.btn-primary { background: var(--primary); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }

.filters { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; margin-bottom: 1.5rem; background: var(--bg-surface); padding: 1rem; border: 1px solid var(--border-color); border-radius: 10px; }
.filter-group { display: flex; flex-direction: column; gap: 4px; min-width: 160px; }
.filter-group label { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
.filter-group select { padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); }
.view-toggle { display: inline-flex; background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 8px; padding: 2px; }
.view-toggle button { background: transparent; border: none; padding: 8px 12px; color: var(--text-muted); cursor: pointer; border-radius: 6px; }
.view-toggle button.active { background: var(--primary); color: white; }

/* Kanban — matches ProjectKanban style */
.kanban {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 1rem;
  scrollbar-width: thin;
}
.kanban::-webkit-scrollbar { height: 6px; }
.kanban::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }

.kcol {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-top: 4px solid var(--col-color);
  border-radius: 10px;
  padding: 0;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
  overflow: hidden;
}
.kcol.drop-target {
  background: rgba(0,131,102,0.06);
  box-shadow: 0 0 0 2px var(--primary);
}

.kcol-head {
  display: flex; align-items: center; gap: 10px;
  padding: 0.9rem 1rem 0.75rem;
  background: transparent;
}
.kcol-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--col-color); }
.kcol-head h4 {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
  flex: 1;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.kcol-count {
  background: var(--col-color);
  color: white;
  padding: 1px 9px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 700;
  min-width: 22px;
  text-align: center;
  line-height: 1.5;
  border: none;
}

.kcol-body { display: flex; flex-direction: column; gap: 6px; flex: 1; padding: 0.75rem; }
.kcol-empty { color: var(--text-muted); font-style: italic; text-align: center; padding: 1rem; font-size: 0.85rem; }

.kcard {
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--col-color);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: grab;
  transition: all 0.15s;
  display: flex; flex-direction: column; gap: 6px;
}
.kcard:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.08); border-color: var(--col-color); }
.kcard:active { cursor: grabbing; }
.kcard-top { display: flex; justify-content: space-between; gap: 6px; flex-wrap: wrap; }
.kcard-title { font-size: 0.92rem; font-weight: 700; color: var(--text-main); }
.kcard-desc { font-size: 0.78rem; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.kcard-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }

.prio-pill, .due-pill, .status-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 600; }
.due-pill { background: rgba(100,116,139,0.12); color: var(--text-muted); }
.due-pill.overdue { background: rgba(239,68,68,0.15); color: #ef4444; }
.meta-chip { font-size: 0.7rem; padding: 2px 6px; border-radius: 8px; background: var(--bg-app); border: 1px solid var(--border-color); color: var(--text-muted); display: inline-flex; align-items: center; gap: 3px; }

/* List */
.list-wrap { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 800px; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border-color); color: var(--text-main); font-size: 0.9rem; }
th { background: var(--bg-app); color: var(--text-muted); text-transform: uppercase; font-size: 0.75rem; }
.t-title.done { text-decoration: line-through; color: var(--text-muted); }
.t-desc { font-size: 0.78rem; color: var(--text-muted); }
.overdue { color: #ef4444; font-weight: 600; }
.btn-i { background: transparent; border: 1px solid var(--border-color); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; color: var(--text-muted); margin-left: 4px; }
.btn-i:hover { color: var(--primary); border-color: var(--primary); }
.btn-i.del:hover { color: #ef4444; border-color: #ef4444; }

.empty, .loading { padding: 2rem; text-align: center; color: var(--text-muted); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.modal-content { background: var(--bg-surface); width: 92%; max-width: 560px; border-radius: 12px; max-height: 90vh; overflow-y: auto; }
.modal-header { background: var(--bg-app); padding: 1.1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); }
.modal-header h3 { margin: 0; font-size: 1.05rem; color: var(--text-main); }
.close-btn { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
.form { padding: 1.5rem; }
.form-group { margin-bottom: 0.75rem; }
.form-group label { display: block; margin-bottom: 4px; font-size: 0.82rem; color: var(--text-muted); font-weight: 600; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 9px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); font-family: inherit; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 1rem; }
.btn-save { background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; }
.btn-cancel { background: var(--bg-app); color: var(--text-main); border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 6px; cursor: pointer; }
.btn-del { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); padding: 10px 14px; border-radius: 6px; cursor: pointer; margin-right: auto; }
.btn-del:hover { background: rgba(239,68,68,0.2); }

@media (max-width: 900px) {
  .kanban { grid-template-columns: repeat(3, 220px); }
  .kcol { min-height: 280px; }
}
@media (max-width: 640px) {
  .container { padding: 0.75rem; }
  .header { flex-direction: column; align-items: stretch; gap: 0.6rem; }
  .actions { flex-wrap: wrap; }
  .filters { padding: 0.75rem; gap: 0.6rem; }
  .filter-group { min-width: 130px; flex: 1; }
  .kanban { grid-template-columns: repeat(3, 180px); gap: 0.6rem; }
  .kcol { min-height: 220px; }
  .kcol-head { padding: 0.6rem 0.75rem; }
  .kcol-body { padding: 0.5rem; }
  .kcard { padding: 0.6rem; }
  .kcard-title { font-size: 0.85rem; }
  .grid-2 { grid-template-columns: 1fr; }
}
</style>
