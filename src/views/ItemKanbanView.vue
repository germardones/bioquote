<template>
  <div class="container">
    <div class="header">
      <div class="header-left">
          <button @click="goBack" class="btn-volver">
            <span class="icon">⬅️</span> Volver
          </button>
          <div class="title-section">
              <h2>Kanban de Tareas</h2>
              <p class="subtitle" v-if="item">{{ item.description }}</p>
          </div>
      </div>
      <button class="btn-primary" @click="openAddTaskModal">+ Nueva Tarea</button>
    </div>

    <div v-if="loading" class="loading">Cargando tablero...</div>

    <div v-else class="kanban-board">
      <!-- Column: Pendiente -->
      <div class="kanban-column">
        <div class="column-header status-todo">
          <span>Pendiente</span>
          <span class="count">{{ getTasksByStatus('todo').length }}</span>
        </div>
        <div class="task-list">
          <div v-for="task in getTasksByStatus('todo')" :key="task.id" class="task-card">
            <p>{{ task.title }}</p>
            <div class="task-meta" v-if="task.workerId">
                <span class="worker-badge">{{ getWorkerName(task.workerId) }}</span>
            </div>
            <div class="task-actions">
               <button class="btn-edit" @click="openEditTaskModal(task)" title="Editar">✏️</button>
               <button class="btn-move" @click="moveTask(task, 'in-progress')" title="Iniciar">▶️</button>
               <button class="btn-delete" @click="deleteTask(task.id)">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Column: En Progreso -->
      <div class="kanban-column">
        <div class="column-header status-progress">
          <span>En Progreso</span>
          <span class="count">{{ getTasksByStatus('in-progress').length }}</span>
        </div>
        <div class="task-list">
          <div v-for="task in getTasksByStatus('in-progress')" :key="task.id" class="task-card">
            <p>{{ task.title }}</p>
            <div class="task-meta" v-if="task.workerId">
                <span class="worker-badge">{{ getWorkerName(task.workerId) }}</span>
            </div>
            <div class="task-actions">
               <button class="btn-edit" @click="openEditTaskModal(task)" title="Editar">✏️</button>
               <button class="btn-move" @click="moveTask(task, 'todo')" title="Volver a Pendiente">⬅️</button>
               <button class="btn-move" @click="moveTask(task, 'done')" title="Finalizar">✅</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Column: Terminado -->
      <div class="kanban-column">
        <div class="column-header status-done">
          <span>Terminado</span>
          <span class="count">{{ getTasksByStatus('done').length }}</span>
        </div>
        <div class="task-list">
          <div v-for="task in getTasksByStatus('done')" :key="task.id" class="task-card completed">
            <p>{{ task.title }}</p>
            <div class="task-meta" v-if="task.workerId">
                <span class="worker-badge">{{ getWorkerName(task.workerId) }}</span>
            </div>
            <div class="task-actions">
               <button class="btn-edit" @click="openEditTaskModal(task)" title="Editar">✏️</button>
               <button class="btn-move" @click="moveTask(task, 'in-progress')" title="Reabrir">⬅️</button>
               <button class="btn-delete" @click="deleteTask(task.id)">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Task (Add/Edit) -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
            <h3>{{ isEditing ? 'Editar Tarea' : 'Nueva Tarea' }}</h3>
            <div class="form-group">
                <label>Descripción</label>
                <input v-model="formTask.title" placeholder="Describe la tarea..." @keyup.enter="saveTask" autofocus />
            </div>
            <div class="form-group">
                <label>Asignar a (Opcional)</label>
                <select v-model="formTask.workerId" class="worker-select">
                    <option value="">Sin asignar</option>
                    <option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</option>
                </select>
            </div>
            <div class="modal-buttons">
                <button @click="closeModal" class="btn-cancel">Cancelar</button>
                <button @click="saveTask" class="btn-primary">{{ isEditing ? 'Guardar Cambios' : 'Crear' }}</button>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase/firebaseConfig'
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id
const itemId = route.params.itemId

const loading = ref(true)
const project = ref(null)
const item = ref(null)
const allItems = ref([])
const workers = ref([])

// Modal state
const showModal = ref(false)
const isEditing = ref(false)
const editingTaskId = ref(null)
const formTask = ref({
    title: '',
    workerId: ''
})

onMounted(async () => {
    await Promise.all([fetchProject(), fetchWorkers()])
    loading.value = false
})

const fetchWorkers = async () => {
    try {
        const snap = await getDocs(collection(db, 'workers'))
        workers.value = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(w => w.active) 
    } catch (e) {
        console.error("Error loading workers", e)
    }
}

const fetchProject = async () => {
    try {
        const docRef = doc(db, 'projects', projectId)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
            const data = snap.data()
            project.value = { id: snap.id, ...data }
            allItems.value = data.execution_items || []
            item.value = allItems.value.find(i => String(i.id) === String(itemId))
            
            if (!item.value) {
                alert('Item no encontrado')
                router.back()
            }
            
            if (!item.value.tasks) {
                item.value.tasks = []
            }
        }
    } catch (e) {
        console.error("Error loading project", e)
    }
}

const getTasksByStatus = (status) => {
    return item.value?.tasks?.filter(t => t.status === status) || []
}

const getWorkerName = (id) => {
    const w = workers.value.find(w => w.id === id)
    return w ? w.name : 'Desconocido'
}

// Modal Logic
const openAddTaskModal = () => {
    isEditing.value = false
    editingTaskId.value = null
    formTask.value = { title: '', workerId: '' }
    showModal.value = true
}

const openEditTaskModal = (task) => {
    isEditing.value = true
    editingTaskId.value = task.id
    formTask.value = { title: task.title, workerId: task.workerId || '' }
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
}

const saveTask = async () => {
    if (!formTask.value.title.trim()) return

    if (isEditing.value) {
        // Update existing task
        const task = item.value.tasks.find(t => t.id === editingTaskId.value)
        if (task) {
            task.title = formTask.value.title
            task.workerId = formTask.value.workerId
        }
    } else {
        // Create new task
        const newTask = {
            id: Date.now(),
            title: formTask.value.title,
            status: 'todo',
            workerId: formTask.value.workerId,
            createdAt: new Date()
        }
        item.value.tasks.push(newTask)
    }

    await saveChanges()
    closeModal()
}

const moveTask = async (task, newStatus) => {
    task.status = newStatus
    await saveChanges()
}

const deleteTask = async (taskId) => {
    if (!confirm('¿Eliminar tarea?')) return
    const idx = item.value.tasks.findIndex(t => t.id === taskId)
    if (idx > -1) {
        item.value.tasks.splice(idx, 1)
        await saveChanges()
    }
}

const saveChanges = async () => {
    try {
        const docRef = doc(db, 'projects', projectId)
        
        const cleanItems = allItems.value.map(i => {
           // Auto-calculate progress if tasks exist
           if (i.tasks && i.tasks.length > 0) {
               const doneCount = i.tasks.filter(t => t.status === 'done').length
               const totalCount = i.tasks.length
               // Update execution progress
               if (!i.execution) i.execution = {}
               i.execution.progress = Math.round((doneCount / totalCount) * 100)
           }
           
           const { saved, isNew, ...rest } = i
           return rest 
        })

        await updateDoc(docRef, {
            "execution_items": cleanItems,
            updated_at: new Date()
        })
        
    } catch (e) {
        console.error("Error saving kanban", e)
        alert("Error al guardar cambios")
    }
}

const goBack = () => {
    router.push(`/proyectos-en-curso/${projectId}/gestion`)
}
</script>

<style scoped>
.container {
  width: 100%;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 2rem;
}

.title-section h2 {
    margin: 0;
    font-size: 1.5rem;
}

.subtitle {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.9rem;
}


.btn-primary {
    background-color: var(--primary);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
}

.kanban-board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    align-items: start;
}

.kanban-column {
    background: var(--bg-app);
    border-radius: 12px;
    padding: 1rem;
    min-height: 500px;
    border: 1px solid var(--border-color);
}

.column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    font-weight: bold;
    color: var(--text-main);
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--border-color);
}

.column-header.status-todo { border-color: #fbaceb; }
.column-header.status-progress { border-color: #60a5fa; }
.column-header.status-done { border-color: #4ade80; }

.count {
    background: var(--bg-surface);
    border-radius: 12px;
    padding: 2px 8px;
    font-size: 0.8rem;
    color: var(--text-muted);
    border: 1px solid var(--border-color);
}

.task-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
}

.task-card {
    background: var(--bg-surface);
    padding: 1rem;
    border-radius: 8px;
    box-shadow: var(--shadow);
    transition: all 0.2s;
    border: 1px solid var(--border-color);
}

.task-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.task-card p {
    margin: 0 0 0.8rem 0;
    color: var(--text-main);
    font-weight: 500;
}

.task-card.completed p {
    text-decoration: line-through;
    color: var(--text-muted);
    opacity: 0.6;
}

.task-meta {
    margin-bottom: 0.8rem;
}

.worker-badge {
    background: rgba(14, 165, 233, 0.1);
    color: #0ea5e9;
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: 4px;
}

.task-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}

.btn-move, .btn-delete, .btn-edit {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    padding: 4px;
    border-radius: 4px;
    color: var(--text-muted);
}

.btn-move:hover, .btn-edit:hover {
    background: var(--bg-app);
    color: var(--primary);
}

.btn-delete:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
}

/* Modal */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal {
    background: var(--bg-surface);
    padding: 2rem;
    border-radius: 12px;
    width: 400px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-muted);
    font-size: 0.9rem;
}

.modal input, .worker-select {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--input-bg);
    color: var(--text-main);
}

.modal-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
}

.btn-cancel {
    background: var(--bg-app);
    border: 1px solid var(--border-color);
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--text-muted);
    font-weight: 500;
}

.btn-cancel:hover {
    background: var(--bg-surface);
    border-color: var(--primary);
    color: var(--primary);
}
</style>
