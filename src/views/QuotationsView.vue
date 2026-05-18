<template>
  <div class="container">
    <div class="header">
      <h2>Mis Cotizaciones</h2>
      <div class="actions">
        <button @click="router.push('/dashboard')" class="btn-volver" :disabled="loading">
           Volver
        </button>
      </div>
    </div>

    <!-- Status filter pills -->
    <div class="filter-bar" v-if="!loading && allProjects.length > 0">
      <button
        v-for="f in filters"
        :key="f.value"
        class="filter-pill"
        :class="{ active: activeFilter === f.value }"
        @click="activeFilter = f.value"
      >
        {{ f.label }}
        <span class="filter-count">{{ countFor(f.value) }}</span>
      </button>
    </div>

    <div v-if="loading" class="loading">Cargando cotizaciones...</div>

    <div v-else-if="filteredProjects.length > 0">
      <div class="table-responsive">
        <table class="projects-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Proyecto</th>
              <th>Fecha</th>
              <th>Monto Base</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filteredProjects" :key="p.id">
              <td data-label="Código"><span class="badge-code">{{ p.codigo }}</span></td>
              <td data-label="Cliente">{{ p.client_name }}</td>
              <td data-label="Proyecto">{{ p.name }}</td>
              <td data-label="Fecha">
                {{ formatFecha(p.created_at) }}
                <span v-if="p.validUntil" class="validity" :class="validityClass(p)">
                  · vence {{ formatValidity(p.validUntil) }}
                </span>
              </td>
              <td data-label="Monto Base" class="monto">${{ (p.financials?.quoted_price || 0).toLocaleString() }}</td>
              <td data-label="Estado">
                <span class="badge-status" :class="statusCssClass(p.status)">{{ statusLabel(p.status) }}</span>
                <span v-if="(p.versions || []).length > 0" class="version-pill" :title="`${p.versions.length} versión(es) guardadas`">
                  v{{ (p.versions || []).length + 1 }}
                </span>
              </td>
              <td data-label="Acciones" class="actions-cell">
                <button class="btn-icon-view" title="Ver detalle" @click="verDetalle(p)">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button class="btn-icon-edit" title="Editar cotización" @click="editarCotizacion(p)">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button v-if="p.status === 'Draft'" class="btn-icon-scope" title="Editar Alcances" @click="abrirModalAlcances(p)">
                    <i class="fa-solid fa-file-contract"></i>
                </button>

                <!-- Forward transitions -->
                <button
                  v-for="next in nextTransitionsFor(p.status)"
                  :key="next"
                  class="btn-transition"
                  :class="transitionClass(next)"
                  :title="transitionTitle(next)"
                  @click="transitionTo(p, next)"
                >
                  <i :class="transitionIcon(next)"></i>
                </button>

                <button class="btn-icon-danger" title="Eliminar" @click="eliminarCotizacion(p)">
                    <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="empty-state">
      <p v-if="allProjects.length === 0">No tienes cotizaciones activas.</p>
      <p v-else>Sin cotizaciones para este filtro.</p>
      <button @click="router.push('/cotizar')" class="btn-crear">Crear Nueva Cotización</button>
    </div>
  </div>
    <ScopeModal
      :show="showScopeModal"
      :projectId="selectedProjectId"
      @close="showScopeModal = false"
      @saved="onScopeSaved"
    />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db, auth } from '../firebase/firebaseConfig'
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore'
import ScopeModal from '../components/modals/ScopeModal.vue'
import {
  STATUS, QUOTATION_STATUSES, NEXT_TRANSITIONS,
  statusLabel, statusCssClass
} from '../constants/projectStatus'
import { changeProjectStatus } from '../utils/projectLifecycle'

const router = useRouter()
const allProjects = ref([])
const loading = ref(true)
const activeFilter = ref('all')

const filters = [
  { value: 'all',                       label: 'Todas' },
  { value: STATUS.DRAFT,                label: 'Borrador' },
  { value: STATUS.SENT,                 label: 'Enviadas' },
  { value: STATUS.IN_NEGOTIATION,       label: 'Negociación' },
  { value: STATUS.APPROVED,             label: 'Aprobadas' },
  { value: STATUS.REJECTED,             label: 'Rechazadas' }
]

const filteredProjects = computed(() =>
  activeFilter.value === 'all'
    ? allProjects.value
    : allProjects.value.filter(p => p.status === activeFilter.value)
)

const countFor = (val) => val === 'all'
  ? allProjects.value.length
  : allProjects.value.filter(p => p.status === val).length

onMounted(fetchProjects)

async function fetchProjects() {
  try {
    const user = auth.currentUser
    if (!user) return
    const q = query(collection(db, 'projects'), where('owner_uid', '==', user.uid))
    const snapshot = await getDocs(q)
    const data = snapshot.docs.map(d => ({
      id: d.id,
      codigo: d.id.substring(0, 8).toUpperCase(),
      ...d.data()
    }))
    allProjects.value = data
      .filter(p => QUOTATION_STATUSES.includes(p.status))
      .sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0))
  } catch (e) {
    console.error('Error fetching projects:', e)
  } finally {
    loading.value = false
  }
}

const nextTransitionsFor = (status) => NEXT_TRANSITIONS[status] || []

const transitionIcon = (s) => ({
  [STATUS.SENT]:            'fa-solid fa-paper-plane',
  [STATUS.IN_NEGOTIATION]:  'fa-solid fa-comments',
  [STATUS.APPROVED]:        'fa-solid fa-check-double',
  [STATUS.REJECTED]:        'fa-solid fa-ban',
  [STATUS.DRAFT]:           'fa-solid fa-rotate-left',
  [STATUS.EN_CURSO]:        'fa-solid fa-play'
}[s] || 'fa-solid fa-arrow-right')

const transitionClass = (s) => `trans-${statusCssClass(s)}`
const transitionTitle = (s) => `Marcar como "${statusLabel(s)}"`

async function transitionTo(project, newStatus) {
  const confirmMsg = newStatus === STATUS.EN_CURSO
    ? `Iniciar proyecto "${project.codigo}"? Se moverá a Proyectos en Curso.`
    : `Cambiar estado a "${statusLabel(newStatus)}"?`
  if (!confirm(confirmMsg)) return
  try {
    await changeProjectStatus(project, newStatus)
    if (newStatus === STATUS.EN_CURSO) {
      // moves to active projects board
      allProjects.value = allProjects.value.filter(p => p.id !== project.id)
      alert('Proyecto iniciado. Lo verás en "Proyectos en Curso".')
    } else {
      project.status = newStatus
      // If user approved, suggest starting execution
      if (newStatus === STATUS.APPROVED) {
        if (confirm('Cotización aprobada. ¿Iniciar el proyecto ahora?')) {
          await changeProjectStatus(project, STATUS.EN_CURSO)
          allProjects.value = allProjects.value.filter(p => p.id !== project.id)
        }
      }
    }
  } catch (e) {
    console.error('Transición fallida', e)
    alert('No se pudo actualizar el estado.')
  }
}

async function eliminarCotizacion(project) {
  if (!confirm(`¿Eliminar la cotización ${project.codigo}? Esta acción no se puede deshacer.`)) return
  try {
    await deleteDoc(doc(db, 'projects', project.id))
    allProjects.value = allProjects.value.filter(p => p.id !== project.id)
  } catch (e) {
    console.error(e); alert('Error al eliminar la cotización.')
  }
}

const editarCotizacion = (project) => router.push(`/cotizar/edit/${project.id}`)

const formatValidity = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}
const validityClass = (p) => {
  if (!p.validUntil) return ''
  const today = new Date().toISOString().slice(0, 10)
  if (p.validUntil < today) return 'expired'
  // dentro de 5 días → warning
  const inFive = new Date(); inFive.setDate(inFive.getDate() + 5)
  const fiveDaysFromNow = inFive.toISOString().slice(0, 10)
  if (p.validUntil <= fiveDaysFromNow) return 'expiring'
  return ''
}
const verDetalle = (project) => router.push(`/proyectos/${project.id}`)
const formatFecha = (ts) => !ts?.toDate ? '-' :
  new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(ts.toDate())

// Scope modal
const showScopeModal = ref(false)
const selectedProjectId = ref(null)
const abrirModalAlcances = (p) => { selectedProjectId.value = p.id; showScopeModal.value = true }
const onScopeSaved = () => {}
</script>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }

.filter-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; }
.filter-pill {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex; align-items: center; gap: 6px;
}
.filter-pill:hover { color: var(--text-main); border-color: var(--primary); }
.filter-pill.active { background: var(--primary); color: white; border-color: var(--primary); }
.filter-count { background: rgba(255,255,255,0.25); padding: 1px 8px; border-radius: 10px; font-size: 0.75rem; }
.filter-pill:not(.active) .filter-count { background: var(--bg-app); color: var(--text-muted); }

.table-responsive { width: 100%; overflow-x: auto; margin-bottom: 1rem; border-radius: 12px; box-shadow: var(--shadow); }
.projects-table { width: 100%; border-collapse: collapse; background: var(--bg-surface); min-width: 880px; }
th, td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--border-color); color: var(--text-main); }
th { background: var(--bg-app); font-weight: 700; color: var(--text-muted); text-transform: uppercase; font-size: 0.78rem; letter-spacing: 0.05em; white-space: nowrap; }

.badge-code { font-family: monospace; background: var(--bg-app); padding: 4px 8px; border-radius: 6px; font-size: 0.85em; color: var(--text-muted); border: 1px solid var(--border-color); }
.monto { font-weight: 800; color: var(--primary); }

.badge-status {
  padding: 4px 12px; border-radius: 12px;
  font-size: 0.8em; font-weight: 600;
  background: var(--bg-app); color: var(--text-muted);
  border: 1px solid var(--border-color);
  display: inline-block; white-space: nowrap;
}
.badge-status.draft           { background: rgba(56, 189, 248, 0.15);  color: #38bdf8; border-color: rgba(56, 189, 248, 0.3); }
.badge-status.sent            { background: rgba(251, 191, 36, 0.15);  color: #fbbf24; border-color: rgba(251, 191, 36, 0.3); }
.badge-status.in-negotiation  { background: rgba(168, 85, 247, 0.15);  color: #a855f7; border-color: rgba(168, 85, 247, 0.3); }
.badge-status.approved        { background: rgba(74, 222, 128, 0.15);  color: #4ade80; border-color: rgba(74, 222, 128, 0.3); }
.badge-status.rejected        { background: rgba(248, 113, 113, 0.15); color: #f87171; border-color: rgba(248, 113, 113, 0.3); }

.actions-cell { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
.validity { font-size: 0.78rem; color: var(--text-muted); display: block; }
.validity.expiring { color: #d97706; font-weight: 600; }
.validity.expired { color: #ef4444; font-weight: 700; }
.version-pill { background: var(--bg-app); border: 1px solid var(--border-color); color: var(--text-muted); padding: 1px 6px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; margin-left: 4px; }

.btn-icon-danger, .btn-icon-edit, .btn-icon-view, .btn-icon-scope, .btn-transition {
  width: 32px; height: 32px; border-radius: 6px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem; transition: all 0.2s;
  background: transparent; border: 1px solid var(--border-color);
}
.btn-icon-danger { color: #ef4444; border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.1); }
.btn-icon-edit   { color: #f59e0b; border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.1); }
.btn-icon-view   { color: #3b82f6; border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.1); }
.btn-icon-scope  { color: #8b5cf6; border-color: rgba(139,92,246,0.3); background: rgba(139,92,246,0.1); }
.btn-icon-danger:hover, .btn-icon-edit:hover, .btn-icon-view:hover, .btn-icon-scope:hover, .btn-transition:hover { transform: scale(1.05); }

.btn-transition.trans-sent           { color: #fbbf24; border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.1); }
.btn-transition.trans-in-negotiation { color: #a855f7; border-color: rgba(168,85,247,0.3); background: rgba(168,85,247,0.1); }
.btn-transition.trans-approved       { color: #10b981; border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.1); }
.btn-transition.trans-rejected       { color: #ef4444; border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.1); }
.btn-transition.trans-draft          { color: #64748b; border-color: rgba(100,116,139,0.3); background: rgba(100,116,139,0.1); }
.btn-transition.trans-en-curso       { color: #22c55e; border-color: rgba(34,197,94,0.3); background: rgba(34,197,94,0.1); }

.empty-state { text-align: center; padding: 4rem 2rem; background: var(--bg-surface); border-radius: 16px; border: 1px solid var(--border-color); box-shadow: var(--shadow); color: var(--text-muted); }
.btn-crear { background: var(--primary); color: white; border: none; padding: 10px 18px; border-radius: 8px; margin-top: 1rem; cursor: pointer; }

@media (max-width: 768px) {
  .container { padding: 1rem; }
  .header { flex-direction: column; align-items: stretch; gap: 1rem; }
  .projects-table, .projects-table tbody, .projects-table tr, .projects-table td { display: block; width: 100%; }
  .projects-table thead { display: none; }
  .projects-table tr { margin-bottom: 1rem; border: 1px solid var(--border-color); background: var(--bg-surface); border-radius: 8px; padding: 1rem; }
  .projects-table td { padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); text-align: right; display: flex; justify-content: space-between; align-items: center; }
  .projects-table td:last-child { border-bottom: none; }
  .projects-table td::before { content: attr(data-label); font-weight: 600; color: var(--text-muted); font-size: 0.85rem; }
  .actions-cell { justify-content: flex-end; }
}
</style>
