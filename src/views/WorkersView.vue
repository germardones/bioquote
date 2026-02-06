<template>
  <div class="container">
    <div class="header">
      <div class="title-group">
        <h2><i class="fa-solid fa-user-gear icon-accent"></i> Gestión de Usuarios</h2>
      </div>
      <div class="action-group">
        <button @click="openCreateModal" class="btn-create">
          <i class="fa-solid fa-plus"></i> Agregar Usuario
        </button>
        <button @click="router.push('/dashboard')" class="btn-volver">
           Volver
        </button>
      </div>
    </div>

    <!-- Lista de Usuarios -->
    <div class="workers-list-section">
      <div v-if="loading" class="loading-state">
        <i class="fa-solid fa-spinner fa-spin"></i> Cargando...
      </div>
      
      <div v-else-if="workers.length > 0" class="table-responsive">
        <table class="workers-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Email</th>
              <th class="text-right">Costo Hora</th>
              <th>Estado</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in workers" :key="w.id">
              <td>
                <div class="user-info">
                  <div class="avatar"><i class="fa-solid fa-user"></i></div>
                  <strong>{{ w.name }}</strong>
                </div>
              </td>
              <td data-label="Rol">{{ w.role }}</td>
              <td data-label="Email">{{ w.email }}</td>
              <td class="text-right" data-label="Costo Hora">{{ formatCurrency(w.hourlyRate) }}</td>
              <td data-label="Estado">
                  <span class="badge" :class="w.active ? 'active' : 'inactive'">
                      {{ w.active ? 'Activo' : 'Inactivo' }}
                  </span>
              </td>
              <td class="text-center" data-label="Acciones">
                <button class="btn-icon" title="Editar" @click="editWorker(w)">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-icon" :title="w.active ? 'Desactivar' : 'Activar'" @click="toggleStatus(w)">
                  <i class="fa-solid" :class="w.active ? 'fa-ban' : 'fa-check'"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-else class="empty-msg">
        <i class="fa-solid fa-users-slash"></i>
        <p>No hay usuarios registrados.</p>
      </div>
    </div>

    <!-- Modal Formulario -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fa-solid" :class="editingWorker ? 'fa-user-pen' : 'fa-user-plus'"></i> 
          {{ editingWorker ? 'Editar Usuario' : 'Nuevo Usuario' }}</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        
        <form @submit.prevent="saveWorker" class="worker-form">
          <div class="form-group">
            <label>Nombre Completo:</label>
            <input v-model="form.name" required type="text" placeholder="Ej. Juan Pérez" />
          </div>
          <div class="form-group">
            <label>Rol / Cargo:</label>
            <input v-model="form.role" required type="text" placeholder="Ej. Desarrollador Backend" />
          </div>
          <div class="form-group">
            <label>Email:</label>
            <input v-model="form.email" required type="email" placeholder="juan@ejemplo.com" />
          </div>
          <div class="form-group">
            <label>Costo Hora (CLP):</label>
            <div class="input-with-icon">
              <span class="prefix">$</span>
              <input v-model.number="form.hourlyRate" required type="number" placeholder="Ej. 15000" min="0" />
            </div>
          </div>
          
          <div class="modal-actions">
             <button type="button" class="btn-cancel" @click="closeModal">Cancelar</button>
             <button type="submit" class="btn-save" :disabled="saving">
               <i v-if="saving" class="fa-solid fa-circle-notch fa-spin"></i>
               {{ editingWorker ? 'Actualizar Usuario' : 'Crear Usuario' }}
             </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../firebase/firebaseConfig'
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore'

const router = useRouter()
const workers = ref([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const editingWorker = ref(null)

const form = reactive({
  name: '',
  role: '',
  email: '',
  hourlyRate: 0
})

onMounted(async () => {
    await fetchWorkers()
})

const fetchWorkers = async () => {
    loading.value = true
    try {
        const q = query(collection(db, 'workers'), orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)
        workers.value = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
    } catch (e) {
        console.error("Error fetching workers:", e)
    } finally {
        loading.value = false
    }
}

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0)
}

const openCreateModal = () => {
    editingWorker.value = null
    resetForm()
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
    resetForm()
}

const saveWorker = async () => {
    saving.value = true
    try {
        if (editingWorker.value) {
            // Update
            const docRef = doc(db, 'workers', editingWorker.value.id)
            await updateDoc(docRef, { ...form })
        } else {
            // Create
            await addDoc(collection(db, 'workers'), {
                ...form,
                active: true,
                createdAt: new Date()
            })
        }
        closeModal()
        await fetchWorkers()
    } catch (e) {
        console.error("Error saving worker:", e)
        alert('Error al guardar usuario')
    } finally {
        saving.value = false
    }
}

const editWorker = (worker) => {
    editingWorker.value = worker
    form.name = worker.name
    form.role = worker.role
    form.email = worker.email
    form.hourlyRate = worker.hourlyRate || 0
    showModal.value = true
}

const resetForm = () => {
    form.name = ''
    form.role = ''
    form.email = ''
    form.hourlyRate = 0
}

const toggleStatus = async (worker) => {
    try {
        const newStatus = !worker.active
        const docRef = doc(db, 'workers', worker.id)
        await updateDoc(docRef, { active: newStatus })
        worker.active = newStatus
    } catch (e) {
        console.error("Error updating status:", e)
    }
}
</script>

<style scoped>
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2.5rem;
}

.title-group h2 {
    margin: 0;
    font-size: 1.8rem;
    color: var(--text-main);
}

.action-group {
    display: flex;
    gap: 1rem;
}

.icon-accent {
    color: var(--primary);
    margin-right: 12px;
}

/* Table styling */
.table-responsive {
    background: var(--bg-surface);
    border-radius: 12px;
    box-shadow: var(--shadow);
    overflow: hidden;
    border: 1px solid var(--border-color);
}

.workers-table {
    width: 100%;
    border-collapse: collapse;
}

.workers-table th {
    background: var(--bg-app);
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-muted);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    border-bottom: 1px solid var(--border-color);
}

.workers-table td {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-main);
    font-size: 0.95rem;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.avatar {
    width: 32px;
    height: 32px;
    background: var(--bg-app);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
}

.text-right { text-align: right; }
.text-center { text-align: center; }

.badge {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
}
.badge.active { background: #dcfce7; color: #15803d; }
.badge.inactive { background: #fee2e2; color: #b91c1c; }

.btn-icon {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 1.1rem;
    cursor: pointer;
    transition: color 0.2s;
    padding: 4px;
}

.btn-icon:hover { color: var(--primary); }
.btn-icon.delete:hover { color: #dc2626; }

.btn-create {
    background: var(--primary);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-create:hover {
    background: #006e53;
    transform: translateY(-1px);
}

/* Modal Styling */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; 
    width: 100%; height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center; justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
}

.modal-content {
    background: var(--bg-surface);
    width: 90%;
    max-width: 500px;
    border-radius: 12px;
    padding: 0;
    overflow: hidden;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25);
}

.modal-header {
    background: var(--bg-app);
    padding: 1.25rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
}

.modal-header h3 { margin: 0; font-size: 1.1rem; color: var(--text-main); }

.close-btn {
    background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer;
}

.worker-form {
    padding: 1.5rem;
}

.form-group {
    margin-bottom: 1.25rem;
}

.form-group label {
    display: block; margin-bottom: 0.4rem; font-weight: 500; font-size: 0.9rem; color: var(--text-main);
}

.form-group input {
    width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.95rem; outline: none; transition: border-color 0.2s; background: var(--input-bg); color: var(--text-main);
}

.form-group input:focus { border-color: var(--primary); }

.input-with-icon {
    position: relative;
    display: flex;
    align-items: center;
}

.prefix {
    position: absolute;
    left: 10px;
    color: var(--text-muted);
    font-weight: 500;
}

.input-with-icon input {
    padding-left: 24px;
}

.modal-actions {
    display: flex; justify-content: flex-end; gap: 10px; margin-top: 2rem;
}

.btn-save {
    background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;
}

.btn-cancel {
    background: var(--bg-app); color: var(--text-muted); border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer;
}

.loading-state, .empty-msg {
    text-align: center; padding: 4rem; color: var(--text-muted); background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border-color);
}

.loading-state i, .empty-msg i { font-size: 2rem; margin-bottom: 1rem; display: block; }

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
  
  .header {
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .title-group h2 {
    font-size: 1.5rem;
  }

  .action-group {
    width: 100%;
    justify-content: space-between;
  }

  .btn-create, .btn-volver {
    flex: 1;
    justify-content: center;
  }

  /* Table to Card Transformation */
  .workers-table, .workers-table tbody, .workers-table tr, .workers-table td {
    display: block;
    width: 100%;
  }

  .workers-table thead {
    display: none;
  }

  .workers-table tr {
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 1rem;
  }
  
  .workers-table tr:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .workers-table td {
    padding: 0.5rem 1rem;
    border-bottom: none;
    text-align: right; /* Default align right for values */
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .workers-table td::before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--text-muted);
    font-size: 0.85rem;
    text-transform: uppercase;
  }

  /* First cell (Name) specific styling */
  .workers-table td:first-child {
    justify-content: flex-start;
    padding-top: 0;
  }
  
  .workers-table td:first-child::before {
    display: none;
  }

  .text-right, .text-center {
    text-align: inherit;
  }
  
  /* Modal responsive */
  .modal-content {
    width: 95%;
    margin: 0 1rem;
  }
}
</style>
