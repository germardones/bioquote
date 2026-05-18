<template>
  <div class="container">
    <div class="header">
      <div class="title-group">
        <h2>Gestión de Colaboradores</h2>
      </div>
      <div class="action-group">
        <button @click="router.push('/equipo/ausencias')" class="btn-secondary">
          <i class="fa-solid fa-umbrella-beach"></i> Ausencias
        </button>
        <button @click="openCreateModal" class="btn-create">
          <i class="fa-solid fa-plus"></i> Agregar
        </button>
        <button @click="router.push('/dashboard')" class="btn-volver">Volver</button>
      </div>
    </div>

    <!-- Status filter -->
    <div class="filter-bar" v-if="!loading && workers.length > 0">
      <button
        v-for="f in filters" :key="f.value"
        class="filter-pill"
        :class="{ active: activeFilter === f.value }"
        @click="activeFilter = f.value"
      >
        {{ f.label }} <span class="count">{{ countFor(f.value) }}</span>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <i class="fa-solid fa-spinner fa-spin"></i> Cargando...
    </div>

    <div v-else-if="filteredWorkers.length > 0" class="table-responsive">
      <table class="workers-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Cargo / Área</th>
            <th>Contrato</th>
            <th>Ingreso</th>
            <th v-if="canSeeSalary" class="text-right">Sueldo / Hora</th>
            <th class="text-center">Vacaciones</th>
            <th>Estado</th>
            <th class="text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in filteredWorkers" :key="w.id">
            <td>
              <div class="user-info">
                <div class="avatar"><i class="fa-solid fa-user"></i></div>
                <div>
                  <strong>
                    {{ w.name }}
                    <span v-if="w.esSocio" class="partner-pill" title="Socio">SOCIO</span>
                  </strong>
                  <div class="email-sub">{{ w.email }}</div>
                </div>
              </div>
            </td>
            <td data-label="Cargo">
              <div>{{ w.role || '—' }}</div>
              <small class="muted">{{ w.area || '—' }}</small>
            </td>
            <td data-label="Contrato">{{ w.contractType || '—' }}</td>
            <td data-label="Ingreso">{{ formatDate(w.startDate) }}</td>
            <td v-if="canSeeSalary" class="text-right" data-label="Sueldo / Hora">
              <div>{{ formatCurrency(w.salary) }}</div>
              <small class="muted">{{ formatCurrency(w.hourlyRate) }}/h</small>
            </td>
            <td class="text-center" data-label="Vacaciones">
              <div class="vac-balance">
                <strong>{{ vacationUsed(w.id) }}</strong>
                <span class="muted"> / {{ w.vacationDaysTotal || 15 }}</span>
              </div>
              <div class="vac-bar">
                <div class="vac-fill" :style="{ width: vacationPct(w) + '%' }"></div>
              </div>
            </td>
            <td data-label="Estado">
              <span class="badge" :style="badgeStyle(normalizedStatus(w))">
                {{ statusMeta(normalizedStatus(w)).label }}
              </span>
            </td>
            <td class="text-center" data-label="Acciones">
              <button class="btn-icon" title="Editar" @click="editWorker(w)">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-icon-del" title="Eliminar" @click="deleteWorker(w)">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty-msg">
      <i class="fa-solid fa-users-slash"></i>
      <p>Sin colaboradores que coincidan.</p>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            <i class="fa-solid" :class="editingWorker ? 'fa-user-pen' : 'fa-user-plus'"></i>
            {{ editingWorker ? 'Editar Colaborador' : 'Nuevo Colaborador' }}
          </h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>

        <form @submit.prevent="saveWorker" class="worker-form">
          <div class="grid-2">
            <div class="form-group">
              <label>Nombre completo</label>
              <input v-model="form.name" required type="text" placeholder="Juan Pérez" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input v-model="form.email" required type="email" placeholder="juan@ejemplo.com" />
            </div>
            <div class="form-group">
              <label>Cargo</label>
              <input v-model="form.role" required type="text" placeholder="Desarrollador Backend" />
            </div>
            <div class="form-group">
              <label>Área</label>
              <input v-model="form.area" type="text" placeholder="Desarrollo / Diseño / Ventas..." />
            </div>
            <div class="form-group">
              <label>Tipo de contrato</label>
              <select v-model="form.contractType">
                <option v-for="c in CONTRACT_TYPES" :key="c.id" :value="c.id">{{ c.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Estado</label>
              <select v-model="form.estado">
                <option v-for="s in EMPLOYEE_STATUS" :key="s.id" :value="s.id">{{ s.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Fecha de ingreso</label>
              <input v-model="form.startDate" type="date" />
            </div>
            <div v-if="canSeeSalary" class="form-group">
              <label>Sueldo base (CLP)</label>
              <input v-model.number="form.salary" type="number" min="0" placeholder="1500000" />
            </div>
            <div v-if="canSeeSalary" class="form-group">
              <label>Costo hora (CLP)</label>
              <input v-model.number="form.hourlyRate" required type="number" min="0" placeholder="15000" />
            </div>
            <div class="form-group">
              <label>Días de vacaciones anuales</label>
              <input v-model.number="form.vacationDaysTotal" type="number" min="0" placeholder="15" />
            </div>
            <div class="form-group checkbox-row">
              <label>
                <input type="checkbox" v-model="form.esSocio" />
                Es socio de la empresa
              </label>
              <small class="muted">Permite registrar retiros a su nombre.</small>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeModal">Cancelar</button>
            <button type="submit" class="btn-save" :disabled="saving">
              <i v-if="saving" class="fa-solid fa-circle-notch fa-spin"></i>
              {{ editingWorker ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../firebase/firebaseConfig'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { EMPLOYEE_STATUS, CONTRACT_TYPES, statusMeta, normalizedStatus } from '../constants/employee'
import { useAbsencesStore } from '../store/absences'
import { ABSENCE_STATUS } from '../constants/employee'
import { useRole } from '../composables/useRole'

const { canSeeSalary } = useRole()

const router = useRouter()
const workers = ref([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const editingWorker = ref(null)
const absencesStore = useAbsencesStore()

const activeFilter = ref('all')
const filters = [
  { value: 'all', label: 'Todos' },
  { value: 'Activo', label: 'Activos' },
  { value: 'ConLicencia', label: 'Con licencia' },
  { value: 'Desvinculado', label: 'Desvinculados' }
]

const filteredWorkers = computed(() => {
  if (activeFilter.value === 'all') return workers.value
  return workers.value.filter(w => normalizedStatus(w) === activeFilter.value)
})
const countFor = (v) => v === 'all'
  ? workers.value.length
  : workers.value.filter(w => normalizedStatus(w) === v).length

const form = reactive({
  name: '', email: '', role: '', area: '',
  contractType: 'Indefinido',
  estado: 'Activo',
  startDate: '', salary: 0,
  hourlyRate: 0,
  vacationDaysTotal: 15,
  esSocio: false
})

onMounted(async () => {
  await Promise.all([fetchWorkers(), absencesStore.fetchAll()])
})

async function fetchWorkers() {
  loading.value = true
  try {
    const snap = await getDocs(query(collection(db, 'workers'), orderBy('createdAt', 'desc')))
    workers.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error('Error fetching workers:', e)
  } finally {
    loading.value = false
  }
}

const vacationUsed = (workerId) => absencesStore.approvedForWorker(workerId, 'vacaciones')
const vacationPct = (w) => {
  const total = Number(w.vacationDaysTotal || 15)
  const used = vacationUsed(w.id)
  return total ? Math.min(100, Math.round((used / total) * 100)) : 0
}

const formatCurrency = (a) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(a || 0)
const formatDate = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
const badgeStyle = (id) => {
  const c = statusMeta(id).color
  return { background: c + '22', color: c, border: `1px solid ${c}55` }
}

function openCreateModal() {
  editingWorker.value = null
  resetForm()
  showModal.value = true
}
function closeModal() { showModal.value = false; resetForm() }
function resetForm() {
  Object.assign(form, {
    name: '', email: '', role: '', area: '',
    contractType: 'Indefinido', estado: 'Activo',
    startDate: '', salary: 0, hourlyRate: 0, vacationDaysTotal: 15,
    esSocio: false
  })
}

async function saveWorker() {
  saving.value = true
  try {
    const payload = { ...form, active: form.estado === 'Activo' } // keep legacy `active` in sync
    if (editingWorker.value) {
      await updateDoc(doc(db, 'workers', editingWorker.value.id), payload)
    } else {
      await addDoc(collection(db, 'workers'), { ...payload, createdAt: new Date() })
    }
    closeModal()
    await fetchWorkers()
  } catch (e) {
    console.error('Error saving worker:', e)
    alert('Error al guardar colaborador')
  } finally { saving.value = false }
}

async function deleteWorker(w) {
  if (!confirm(`¿ELIMINAR permanentemente a "${w.name}"?\n\nEsta acción no se puede deshacer.`)) return
  try {
    await deleteDoc(doc(db, 'workers', w.id))
    workers.value = workers.value.filter(x => x.id !== w.id)
  } catch (e) {
    console.error('Error deleting worker:', e)
    alert('Error al eliminar colaborador')
  }
}

function editWorker(w) {
  editingWorker.value = w
  Object.assign(form, {
    name: w.name || '',
    email: w.email || '',
    role: w.role || '',
    area: w.area || '',
    contractType: w.contractType || 'Indefinido',
    estado: normalizedStatus(w),
    startDate: w.startDate || '',
    salary: w.salary || 0,
    hourlyRate: w.hourlyRate || 0,
    vacationDaysTotal: w.vacationDaysTotal || 15,
    esSocio: !!w.esSocio
  })
  showModal.value = true
}
</script>

<style scoped>
.container { max-width: 1300px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.title-group h2 { margin: 0; font-size: 1.7rem; color: var(--text-main); }
.action-group { display: flex; gap: 0.75rem; flex-wrap: wrap; }

.filter-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
.filter-pill { background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-muted); padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.filter-pill.active { background: var(--primary); color: white; border-color: var(--primary); }
.count { background: rgba(255,255,255,0.25); padding: 1px 8px; border-radius: 10px; font-size: 0.72rem; }
.filter-pill:not(.active) .count { background: var(--bg-app); color: var(--text-muted); }

.table-responsive { background: var(--bg-surface); border-radius: 12px; box-shadow: var(--shadow); overflow: hidden; border: 1px solid var(--border-color); }
.workers-table { width: 100%; border-collapse: collapse; }
.workers-table th { background: var(--bg-app); padding: 0.9rem 1rem; text-align: left; font-weight: 600; color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase; }
.workers-table td { padding: 0.9rem 1rem; border-bottom: 1px solid var(--border-color); color: var(--text-main); font-size: 0.92rem; }
.user-info { display: flex; align-items: center; gap: 0.75rem; }
.avatar { width: 36px; height: 36px; background: var(--bg-app); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
.email-sub { font-size: 0.75rem; color: var(--text-muted); }
.muted { color: var(--text-muted); font-size: 0.78rem; }
.text-right { text-align: right; } .text-center { text-align: center; }

.vac-balance { font-size: 0.9rem; }
.vac-bar { width: 80px; height: 5px; background: var(--bg-app); border-radius: 3px; margin: 4px auto 0; overflow: hidden; }
.vac-fill { height: 100%; background: var(--primary); transition: width 0.3s; }

.badge { padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
.btn-icon { background: transparent; border: none; color: var(--text-muted); font-size: 1.05rem; cursor: pointer; padding: 4px; }
.btn-icon:hover { color: var(--primary); }
.btn-icon-del { background: transparent; border: none; color: var(--text-muted); font-size: 1.05rem; cursor: pointer; padding: 4px; margin-left: 4px; }
.btn-icon-del:hover { color: #ef4444; }
.partner-pill { background: rgba(0,131,102,0.15); color: var(--primary); font-size: 0.62rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-left: 6px; letter-spacing: 0.05em; vertical-align: middle; }
.checkbox-row { grid-column: 1 / -1; }
.checkbox-row > label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem; color: var(--text-main); font-weight: 600; margin-bottom: 4px; }
.checkbox-row > label input[type="checkbox"] {
  width: 18px !important;
  height: 18px;
  padding: 0;
  margin: 0;
  cursor: pointer;
  accent-color: var(--primary);
  flex-shrink: 0;
}
.checkbox-row small { color: var(--text-muted); font-size: 0.78rem; margin-left: 28px; display: block; }
.btn-create { background: var(--primary); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; }
.btn-secondary { background: var(--bg-surface); color: var(--text-main); border: 1px solid var(--border-color); padding: 10px 18px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; }
.btn-secondary:hover { border-color: var(--primary); color: var(--primary); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.modal-content { background: var(--bg-surface); width: 92%; max-width: 720px; border-radius: 12px; overflow: hidden; max-height: 90vh; overflow-y: auto; }
.modal-header { background: var(--bg-app); padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); }
.modal-header h3 { margin: 0; font-size: 1.05rem; color: var(--text-main); }
.close-btn { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
.worker-form { padding: 1.5rem; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group label { display: block; margin-bottom: 4px; font-size: 0.82rem; color: var(--text-muted); font-weight: 600; }
.form-group input, .form-group select { width: 100%; padding: 9px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 1.5rem; }
.btn-save { background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; }
.btn-cancel { background: var(--bg-app); color: var(--text-main); border: 1px solid var(--border-color); padding: 10px 20px; border-radius: 6px; cursor: pointer; }

.loading-state, .empty-msg { text-align: center; padding: 3rem; color: var(--text-muted); background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border-color); }
.loading-state i, .empty-msg i { font-size: 1.8rem; margin-bottom: 0.75rem; display: block; }

@media (max-width: 768px) {
  .container { padding: 1rem; }
  .header { flex-direction: column; }
  .grid-2 { grid-template-columns: 1fr; }
  .workers-table, .workers-table tbody, .workers-table tr, .workers-table td { display: block; width: 100%; }
  .workers-table thead { display: none; }
  .workers-table tr { padding: 1rem; border-bottom: 1px solid var(--border-color); }
  .workers-table td { padding: 0.5rem 0; display: flex; justify-content: space-between; text-align: right; border: none; }
  .workers-table td::before { content: attr(data-label); font-weight: 600; color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase; }
  .workers-table td:first-child { justify-content: flex-start; }
  .workers-table td:first-child::before { display: none; }
}
</style>
