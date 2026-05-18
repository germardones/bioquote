<template>
  <div class="project-container">
    <div class="header">
      <h2>Detalle del Proyecto</h2>
      <div class="actions">
        <span v-if="project && project.codigo" class="codigo-cotizacion">ID: {{ project.codigo }}</span>
       <button @click="router.back()" class="btn-volver" :disabled="loading">
         Volver
       </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Cargando detalles...</div>

    <div v-else-if="project" class="card resumen">
      <div class="status-bar">
        <span class="status-badge" :class="getStatusClass(project.status)">{{ statusLabel(project.status) }}</span>
        <span class="date">{{ formatFecha(project.created_at) }}</span>
      </div>

      <h3>Datos del Cliente</h3>
      <p><strong>Nombre:</strong> {{ project.client_name }}</p>
      <p v-if="project.client_data?.razonSocial"><strong>Razón Social:</strong> {{ project.client_data.razonSocial }}</p>
      <p v-if="project.client_data?.rut"><strong>RUT:</strong> {{ project.client_data.rut }}</p>
      <p v-if="project.client_data?.email"><strong>Email:</strong> {{ project.client_data.email }}</p>

      <hr />

      <h3>Especificaciones del Proyecto</h3>
      
      <div v-if="project.specs?.type === 'custom'">
        <div class="custom-items-list">
            <div v-for="(item, idx) in project.specs.custom_items" :key="idx" class="spec-item row-layout">
                <div class="desc">
                    <strong>{{ item.description }}</strong>
                    <span v-if="item.pricingMethod === 'fixed'" class="badge-fixed-sm">Fijo</span>
                    <span v-if="item.observation" class="obs">({{ item.observation }})</span>
                </div>
                <div class="vals">
                    <template v-if="item.pricingMethod === 'fixed'">
                        <span v-if="item.hours > 0" class="mini-hours">{{ item.hours }}h est.</span>
                        <strong>${{ (item.fixedValue || 0).toLocaleString() }}</strong>
                    </template>
                    <template v-else>
                        {{ item.hours }}h x ${{ item.rate?.toLocaleString() }} = <strong>${{ (item.hours * item.rate).toLocaleString() }}</strong>
                    </template>
                </div>
            </div>
        </div>
      </div>

      <div v-else class="specs-grid">
        <div class="spec-item">
          <span class="label">Entidades:</span>
          <span class="value">{{ project.specs?.entity_count || 0 }}</span>
        </div>
        <div class="spec-item">
          <span class="label">Roles:</span>
          <span class="value">{{ project.specs?.role_count || 0 }}</span>
        </div>
        <div class="spec-item">
          <span class="label">Vistas:</span>
          <span class="value">{{ project.specs?.view_count || 0 }}</span>
        </div>
        <div class="spec-item">
          <span class="label">APIs:</span>
          <span class="value">{{ project.specs?.api_count || 0 }}</span>
        </div>
        <div class="spec-item">
          <span class="label">Complejidad:</span>
          <span class="value">{{ project.specs?.complexity || 1.0 }}x</span>
        </div>
      </div>

      <hr />

      <div class="view-mode-bar">
        <span class="vm-label">Vista:</span>
        <div class="vm-toggle">
          <button :class="{ active: viewMode === 'client' }" @click="viewMode = 'client'">
            <i class="fa-solid fa-user-tie"></i> Cliente
          </button>
          <button :class="{ active: viewMode === 'internal' }" @click="viewMode = 'internal'">
            <i class="fa-solid fa-user-shield"></i> Interno
          </button>
        </div>
      </div>

      <h3>Evaluación Financiera</h3>
      <div class="financials-grid">
        <div class="fin-item">
          <span>Horas Estimadas:</span>
          <strong>{{ project.financials?.estimated_hours_market || 0 }} h</strong>
        </div>
        <div v-if="viewMode === 'internal'" class="fin-item">
          <span>Horas Reales (Antigravity):</span>
          <strong>{{ project.financials?.estimated_hours_real || 0 }} h</strong>
        </div>
        <div v-if="viewMode === 'internal' && canSeeSalary" class="fin-item highlight">
          <span>Costo Interno:</span>
          <strong>${{ (project.financials?.internal_cost || 0).toLocaleString() }}</strong>
        </div>
        <div v-if="viewMode === 'internal' && canSeeSalary" class="fin-item highlight">
           <span>Margen Bruto:</span>
           <strong>
             ${{ (project.financials?.projected_margin || 0).toLocaleString() }}
             <small>({{ calcularMargen(project.financials) }}%)</small>
           </strong>
        </div>
      </div>

      <!-- Payment plan -->
      <div v-if="(project.paymentPlan || []).length > 0" class="pp-section">
        <h3>Plan de Pago</h3>
        <table class="pp-table">
          <thead>
            <tr><th>Concepto</th><th class="r">%</th><th class="r">Monto</th><th>Vence</th><th class="c">Estado</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in project.paymentPlan" :key="p.id">
              <td>{{ p.label || '—' }}</td>
              <td class="r">{{ p.percentage }}%</td>
              <td class="r mono">${{ Math.round((project.financials?.quoted_price || 0) * (p.percentage || 0) / 100).toLocaleString() }}</td>
              <td>{{ p.dueDate ? formatShortDate(p.dueDate) : '—' }}</td>
              <td class="c"><span :class="['pp-status', p.paid ? 'paid' : 'pending']">{{ p.paid ? 'Pagado' : 'Pendiente' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Versions -->
      <div v-if="(project.versions || []).length > 0" class="versions-section">
        <h3>Versiones anteriores</h3>
        <ul class="versions-list">
          <li v-for="(v, i) in project.versions" :key="i">
            <span class="v-date">{{ formatDateTime(v.at) }}</span>
            <span class="v-price">${{ (v.price || 0).toLocaleString() }} · {{ v.hours }}h</span>
            <span class="v-by">{{ v.by }}</span>
          </li>
        </ul>
      </div>

      <div class="total-section">
        <h3>Precio Venta</h3>
        <p class="total-price">${{ (project.financials?.quoted_price || 0).toLocaleString() }}</p>
        <p class="disclaimer">+ IVA</p>
      </div>

      <hr />

      <!-- ============ TEAM ASSIGNMENT ============ -->
      <h3>Equipo asignado</h3>
      <div class="team-block">
        <div v-if="assignedWorkers.length === 0" class="empty-mini">
          Sin colaboradores asignados.
        </div>
        <div v-else class="assigned-list">
          <span v-for="w in assignedWorkers" :key="w.id" class="team-pill">
            <i class="fa-solid fa-user"></i> {{ w.name }}
            <button class="pill-x" @click="toggleWorker(w.id)" title="Quitar">&times;</button>
          </span>
        </div>
        <div class="add-assignee">
          <select v-model="newAssigneeId">
            <option value="">Agregar colaborador...</option>
            <option v-for="w in availableWorkers" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
          <button @click="addAssignee" :disabled="!newAssigneeId">
            <i class="fa-solid fa-plus"></i> Asignar
          </button>
        </div>
      </div>

      <hr />

      <!-- ============ MILESTONES ============ -->
      <h3>Hitos del Proyecto</h3>
      <div class="milestones-block">
        <div v-if="(project.milestones || []).length === 0" class="empty-mini">
          Aún no hay hitos definidos.
        </div>
        <ul v-else class="milestones-list">
          <li v-for="m in project.milestones" :key="m.id">
            <label class="milestone-row">
              <input type="checkbox" :checked="m.done" @change="toggleMilestone(m)" />
              <span class="m-title" :class="{ done: m.done }">{{ m.title }}</span>
              <span class="m-date" v-if="m.dueDate">📅 {{ formatShort(m.dueDate) }}</span>
              <button class="m-del" @click.prevent="deleteMilestone(m)" title="Eliminar">
                <i class="fa-solid fa-times"></i>
              </button>
            </label>
          </li>
        </ul>
        <div class="milestone-add">
          <input v-model="newMilestoneTitle" placeholder="Título del hito..." @keyup.enter="addMilestone" />
          <input v-model="newMilestoneDate" type="date" />
          <button @click="addMilestone" :disabled="!newMilestoneTitle">
            <i class="fa-solid fa-plus"></i> Agregar
          </button>
        </div>
      </div>

      <hr />

      <!-- ============ HISTORY ============ -->
      <h3>Historial de Cambios</h3>
      <div v-if="(project.history || []).length === 0" class="empty-mini">
        Sin cambios registrados todavía.
      </div>
      <ul v-else class="history-list">
        <li v-for="(h, i) in reversedHistory" :key="i">
          <span class="h-arrow">
            <span class="h-from">{{ statusLabel(h.from) }}</span>
            <i class="fa-solid fa-arrow-right"></i>
            <span class="h-to" :class="statusCssClass(h.to)">{{ statusLabel(h.to) }}</span>
          </span>
          <span class="h-meta">{{ formatDateTime(h.at) }} · {{ h.by }}</span>
        </li>
      </ul>

      <div class="footer-actions">
        <button class="imprimir-btn" @click="imprimir">🖨️ Imprimir / Exportar PDF</button>
      </div>

    </div>

    <div v-else class="error-msg">
      Proyecto no encontrado.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase/firebaseConfig'
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore'
import { statusLabel, statusCssClass } from '../constants/projectStatus'
import { useRole } from '../composables/useRole'

const { canSeeSalary } = useRole()
const viewMode = ref('client')

const formatShortDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

const route = useRoute()
const router = useRouter()
const project = ref(null)
const loading = ref(true)

const projectId = route.params.id

const allWorkers = ref([])

onMounted(async () => {
  if (!projectId) return
  try {
    const docRef = doc(db, 'projects', projectId)
    const [docSnap, wSnap] = await Promise.all([
      getDoc(docRef),
      getDocs(collection(db, 'workers'))
    ])

    if (docSnap.exists()) {
      project.value = {
        id: docSnap.id,
        codigo: docSnap.id.substring(0, 8).toUpperCase(),
        ...docSnap.data()
      }
    }
    allWorkers.value = wSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error("Error loading project", e)
  } finally {
    loading.value = false
  }
})

// ----- Team assignment -----
const newAssigneeId = ref('')
const assignedIds = computed(() => project.value?.assignedWorkerIds || [])
const assignedWorkers = computed(() =>
  allWorkers.value.filter(w => assignedIds.value.includes(w.id))
)
const availableWorkers = computed(() =>
  allWorkers.value.filter(w => !assignedIds.value.includes(w.id))
)
async function addAssignee() {
  if (!newAssigneeId.value) return
  const id = newAssigneeId.value
  await updateDoc(doc(db, 'projects', projectId), {
    assignedWorkerIds: arrayUnion(id),
    updated_at: serverTimestamp()
  })
  project.value.assignedWorkerIds = [...assignedIds.value, id]
  newAssigneeId.value = ''
}
async function toggleWorker(id) {
  await updateDoc(doc(db, 'projects', projectId), {
    assignedWorkerIds: arrayRemove(id),
    updated_at: serverTimestamp()
  })
  project.value.assignedWorkerIds = assignedIds.value.filter(x => x !== id)
}

const calcularMargen = (fin) => {
    if (!fin) return 0
    const venta = fin.quoted_price || 0
    const margen = fin.projected_margin || 0
    if (venta === 0) return 0
    return Math.round((margen / venta) * 100)
}

const formatFecha = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return ''
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(timestamp.toDate())
}

const imprimir = () => {
    router.push(`/imprimir/${projectId}`)
}

const getStatusClass = (status) => statusCssClass(status)

// ----- Milestones -----
const newMilestoneTitle = ref('')
const newMilestoneDate = ref('')

const reversedHistory = computed(() => [...(project.value?.history || [])].reverse())

const persistMilestones = async (next) => {
  project.value.milestones = next
  await updateDoc(doc(db, 'projects', projectId), {
    milestones: next,
    updated_at: serverTimestamp()
  })
}

const addMilestone = async () => {
  if (!newMilestoneTitle.value.trim()) return
  const m = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: newMilestoneTitle.value.trim(),
    dueDate: newMilestoneDate.value || null,
    done: false
  }
  const next = [...(project.value.milestones || []), m]
  await persistMilestones(next)
  newMilestoneTitle.value = ''
  newMilestoneDate.value = ''
}

const toggleMilestone = async (m) => {
  const next = (project.value.milestones || []).map(x => x.id === m.id ? { ...x, done: !x.done } : x)
  await persistMilestones(next)
}

const deleteMilestone = async (m) => {
  if (!confirm(`Eliminar hito "${m.title}"?`)) return
  const next = (project.value.milestones || []).filter(x => x.id !== m.id)
  await persistMilestones(next)
}

const formatShort = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(d)
}
const formatDateTime = (iso) => {
  if (!iso) return ''
  const d = typeof iso === 'string' ? new Date(iso) : (iso?.toDate ? iso.toDate() : new Date(iso))
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(d)
}
</script>

<style scoped>
.project-container {
  max-width: 800px;
  width: 95%;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h2 {
    margin: 0;
    color: var(--primary);
}

.actions {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.codigo-cotizacion {
  font-family: monospace;
  background: var(--bg-app);
  padding: 4px 8px;
  border-radius: 4px;
  color: var(--text-muted);
}

.card.resumen {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  padding: 2rem;
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.status-bar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    align-items: center;
}

.status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 0.8rem;
    background: var(--bg-app);
    color: var(--text-muted);
}

.status-badge.draft { background: rgba(224, 242, 254, 0.1); color: #0ea5e9; }
.status-badge.sent { background: rgba(254, 243, 199, 0.1); color: #f59e0b; }
.status-badge.approved, .status-badge.en-curso { background: rgba(220, 252, 231, 0.1); color: #10b981; }
.status-badge.rejected { background: rgba(254, 226, 226, 0.1); color: #ef4444; }

.specs-grid, .financials-grid {
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
}

.specs-grid { grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); }
.financials-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }

.spec-item, .fin-item {
    display: flex; 
    flex-direction: column;
}
.spec-item { align-items: center; background: var(--bg-app); padding: 0.5rem; border-radius: 8px; color: var(--text-main); }

.fin-item { 
    flex-direction: row; 
    justify-content: space-between; 
    border-bottom: 1px solid var(--border-color); 
    padding: 0.5rem 0;
    color: var(--text-main);
}

.fin-item strong { color: var(--primary); }

.total-section {
    background: rgba(0, 131, 102, 0.1);
    padding: 1.5rem;
    border-radius: 12px;
    text-align: right;
    border: 1px solid rgba(0, 131, 102, 0.2);
}

.total-price {
    font-size: 2rem;
    font-weight: bold;
    color: var(--primary);
    margin: 0;
}

.footer-actions {
    margin-top: 2rem;
    text-align: right;
}

.imprimir-btn {
    background: var(--bg-header);
    color: var(--text-on-header);
    border: 1px solid var(--border-color);
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.imprimir-btn:hover {
    background: var(--primary);
    border-color: var(--primary);
}

/* View mode toggle */
.view-mode-bar { display: flex; align-items: center; gap: 10px; padding: 0.6rem 0.85rem; background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem; }
.vm-label { font-weight: 700; color: var(--text-muted); font-size: 0.82rem; }
.vm-toggle { display: inline-flex; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 2px; }
.vm-toggle button { background: transparent; border: none; padding: 6px 12px; color: var(--text-muted); cursor: pointer; border-radius: 6px; font-weight: 600; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; }
.vm-toggle button.active { background: var(--primary); color: white; }

/* Payment plan */
.pp-section { margin: 1.5rem 0; }
.pp-table { width: 100%; border-collapse: collapse; }
.pp-table th, .pp-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); font-size: 0.88rem; }
.pp-table th { font-size: 0.72rem; text-transform: uppercase; color: var(--text-muted); }
.pp-table .r { text-align: right; }
.pp-table .c { text-align: center; }
.pp-table .mono { font-family: monospace; font-weight: 700; color: var(--primary); }
.pp-status { padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 700; }
.pp-status.pending { background: rgba(245,158,11,0.15); color: #d97706; }
.pp-status.paid { background: rgba(34,197,94,0.15); color: #16a34a; }

/* Versions */
.versions-section { margin: 1.5rem 0; }
.versions-list { list-style: none; padding: 0; margin: 0; }
.versions-list li { display: flex; justify-content: space-between; gap: 8px; padding: 6px 10px; border-bottom: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-muted); flex-wrap: wrap; }
.v-date { color: var(--text-main); }
.v-price { font-family: monospace; color: var(--primary); font-weight: 600; }

/* Team assignment */
.team-block { margin-bottom: 0.5rem; }
.assigned-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 0.75rem; }
.team-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 14px; background: rgba(0,131,102,0.1); color: var(--primary); border: 1px solid rgba(0,131,102,0.3); font-size: 0.85rem; font-weight: 600; }
.pill-x { background: none; border: none; color: var(--primary); cursor: pointer; font-size: 1rem; padding: 0 0 0 4px; }
.pill-x:hover { color: #ef4444; }
.add-assignee { display: flex; gap: 8px; padding-top: 0.5rem; border-top: 1px dashed var(--border-color); }
.add-assignee select { flex: 1; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); }
.add-assignee button { background: var(--primary); color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.add-assignee button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Milestones */
.milestones-block { margin-bottom: 1rem; }
.empty-mini { color: var(--text-muted); font-style: italic; padding: 0.5rem 0; }
.milestones-list { list-style: none; padding: 0; margin: 0 0 1rem 0; }
.milestone-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border: 1px solid var(--border-color);
  border-radius: 8px; background: var(--bg-app);
  margin-bottom: 6px;
}
.milestone-row .m-title { flex: 1; color: var(--text-main); }
.milestone-row .m-title.done { text-decoration: line-through; color: var(--text-muted); }
.milestone-row .m-date { font-size: 0.78rem; color: var(--text-muted); }
.milestone-row .m-del {
  background: transparent; border: none; color: var(--text-muted);
  cursor: pointer; padding: 0; width: 22px; height: 22px;
}
.milestone-row .m-del:hover { color: #ef4444; }

.milestone-add {
  display: grid;
  grid-template-columns: 1fr 160px auto;
  gap: 8px;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border-color);
}
.milestone-add input { padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); }
.milestone-add button { background: var(--primary); color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.milestone-add button:disabled { opacity: 0.5; cursor: not-allowed; }

/* History */
.history-list { list-style: none; padding: 0; margin: 0 0 1.5rem 0; }
.history-list li {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 10px; border-bottom: 1px solid var(--border-color);
  font-size: 0.88rem;
}
.h-arrow { display: inline-flex; align-items: center; gap: 8px; }
.h-from, .h-to { padding: 2px 8px; border-radius: 10px; font-weight: 600; font-size: 0.78rem; }
.h-from { background: var(--bg-app); color: var(--text-muted); border: 1px solid var(--border-color); }
.h-to { border: 1px solid var(--border-color); }
.h-to.draft           { background: rgba(56, 189, 248, 0.15);  color: #38bdf8; }
.h-to.sent            { background: rgba(251, 191, 36, 0.15);  color: #fbbf24; }
.h-to.in-negotiation  { background: rgba(168, 85, 247, 0.15);  color: #a855f7; }
.h-to.approved        { background: rgba(74, 222, 128, 0.15);  color: #4ade80; }
.h-to.rejected        { background: rgba(248, 113, 113, 0.15); color: #f87171; }
.h-to.en-curso        { background: rgba(34, 197, 94, 0.15);   color: #4ade80; }
.h-to.completed       { background: rgba(96, 165, 250, 0.15);  color: #60a5fa; }
.h-meta { color: var(--text-muted); font-size: 0.78rem; }

@media (max-width: 540px) {
  .milestone-add { grid-template-columns: 1fr; }
  .history-list li { flex-direction: column; align-items: flex-start; gap: 4px; }
}

@media print {
    .btn-volver, .footer-actions, .header button { display: none; }
    .project-container { padding: 0; margin: 0; max-width: 100%; width: 100%; }
    .card { border: none; box-shadow: none; }
}

.spec-item.row-layout {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 0.5rem;
}

.spec-item .obs {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-left: 0.5rem;
}

.badge-fixed-sm {
    background: #ffeeba;
    color: #856404;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: bold;
    text-transform: uppercase;
    margin-left: 0.5rem;
    vertical-align: middle;
}

.mini-hours {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-right: 0.5rem;
}

@media (max-width: 480px) {
    .spec-item.row-layout {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }
    
    .spec-item.row-layout .vals {
        align-self: flex-end; /* Align values to right still, or start? Let's keep right or make full width */
        text-align: right;
        width: 100%;
        margin-top: 4px;
        padding-top: 4px;
        border-top: 1px dashed var(--border-color);
    }
}
</style>
