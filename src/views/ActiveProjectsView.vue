<template>
  <div class="container">
    <div class="header">
      <h2>Proyectos en Curso</h2>
      <div class="actions">
        <div class="view-toggle">
          <button :class="{ active: view === 'list' }" @click="view = 'list'" title="Vista lista">
            <i class="fa-solid fa-list"></i>
          </button>
          <button :class="{ active: view === 'kanban' }" @click="view = 'kanban'" title="Vista kanban">
            <i class="fa-solid fa-table-columns"></i>
          </button>
        </div>
        <button @click="router.push('/dashboard')" class="btn-volver">Volver</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Cargando proyectos...</div>

    <template v-else-if="projects.length > 0">
      <!-- LIST VIEW -->
      <div v-if="view === 'list'" class="projects-list">
         <div v-for="p in projects" :key="p.id" class="project-card">
            <div class="card-column code-col">
                <label>Código</label>
                <span class="badge-code">{{ p.codigo }}</span>
            </div>
            <div class="card-column main-col">
                <div class="client-name">{{ p.client_name }}</div>
                <div class="project-name">{{ p.name }}</div>
                <div class="meta-row" v-if="totalMilestones(p) > 0 || realCost(p) > 0">
                    <span v-if="totalMilestones(p) > 0" class="meta-chip">
                        <i class="fa-solid fa-flag-checkered"></i> {{ doneMilestones(p) }}/{{ totalMilestones(p) }}
                    </span>
                    <span v-if="realCost(p) > 0" class="meta-chip" :class="{ 'over-budget': realCost(p) > projectTotal(p) }">
                        <i class="fa-solid fa-wallet"></i> ${{ realCost(p).toLocaleString('es-CL') }}
                    </span>
                </div>
            </div>
            <div class="card-column date-col">
                <label>Inicio</label>
                <span>{{ formatFecha(p.updated_at || p.created_at) }}</span>
            </div>
            <div class="card-column status-col">
                <label>Estado</label>
                <span class="badge-status" :class="statusCssClass(p.status)">{{ statusLabel(p.status) }}</span>
            </div>
            <div class="card-column actions-col">
                <button class="btn-icon-success" @click="finalizarProyecto(p)" title="Finalizar" v-if="p.status !== 'Completed'">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="btn-icon-danger" @click="eliminarProyecto(p)" title="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
                <button class="btn-revert" @click="revertirProyecto(p)" title="Revertir a Borrador">
                    <i class="fa-solid fa-rotate-left"></i>
                </button>
                <button class="btn-primary" @click="verDetalle(p)" title="Gestionar">
                    <i class="fa-solid fa-gear"></i>
                </button>
            </div>
         </div>
      </div>

      <!-- KANBAN VIEW -->
      <div v-else class="kanban-wrap">
        <div class="kanban-hint">
          <i class="fa-solid fa-circle-info"></i>
          <span>Arrastra las tarjetas entre columnas para cambiar el estado. Desliza horizontalmente para ver más columnas.</span>
        </div>
        <ProjectKanban :projects="enCursoProjects" @open="verDetalle" />
      </div>
    </template>

    <div v-else class="empty-state">
      <p>No tienes proyectos en curso actualmente.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { db, auth } from '../firebase/firebaseConfig'
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore'
import { STATUS, ACTIVE_STATUSES, statusLabel, statusCssClass } from '../constants/projectStatus'
import { changeProjectStatus } from '../utils/projectLifecycle'
import ProjectKanban from '../components/projects/ProjectKanban.vue'

const router = useRouter()
const projects = ref([])
const loading = ref(true)
// Default to list on small screens (kanban is uncomfortable on mobile)
const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
const view = ref(localStorage.getItem('activeProjectsView') || (isMobile ? 'list' : 'list'))

// Persist view preference
watch(view, (v) => localStorage.setItem('activeProjectsView', v))

const enCursoProjects = computed(() => projects.value.filter(p => p.status === STATUS.EN_CURSO))

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
    projects.value = data
      .filter(p => ACTIVE_STATUSES.includes(p.status))
      .sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0))
  } catch (e) {
    console.error('Error fetching projects:', e)
  } finally {
    loading.value = false
  }
}

const formatFecha = (ts) => !ts?.toDate ? '-' :
  new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(ts.toDate())

const verDetalle = (p) => router.push(`/proyectos-en-curso/${p.id}/gestion`)

const projectTotal = (p) => Number(p?.financials?.quoted_price || 0)
const realCost = (p) => (p.execution_items || []).reduce((s, it) => s + (Number(it.hours) || 0) * 25000, 0)
const totalMilestones = (p) => (p.milestones || []).length
const doneMilestones = (p) => (p.milestones || []).filter(m => m.done).length

async function revertirProyecto(project) {
  if (!confirm(`¿Revertir "${project.name}" a borrador?`)) return
  try {
    await changeProjectStatus(project, STATUS.DRAFT)
    projects.value = projects.value.filter(p => p.id !== project.id)
  } catch (e) { console.error(e); alert('Error al revertir el proyecto.') }
}

async function eliminarProyecto(project) {
  if (!confirm(`ADVERTENCIA: ¿ELIMINAR PERMANENTEMENTE "${project.name}"?`)) return
  try {
    await deleteDoc(doc(db, 'projects', project.id))
    projects.value = projects.value.filter(p => p.id !== project.id)
  } catch (e) { console.error(e); alert('Error al eliminar el proyecto.') }
}

async function finalizarProyecto(project) {
  if (!confirm(`¿Finalizar el proyecto "${project.name}"?`)) return
  try {
    await changeProjectStatus(project, STATUS.COMPLETED)
    const idx = projects.value.findIndex(p => p.id === project.id)
    if (idx !== -1) projects.value[idx].status = STATUS.COMPLETED
  } catch (e) { console.error(e); alert('Error al finalizar el proyecto.') }
}
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap; }
.actions { display: flex; gap: 0.75rem; align-items: center; }

.view-toggle { display: inline-flex; background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 8px; padding: 2px; }
.view-toggle button { background: transparent; color: var(--text-muted); border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
.view-toggle button.active { background: var(--primary); color: white; }

.kanban-wrap { width: 100%; }
.kanban-hint { background: var(--bg-app); border: 1px dashed var(--border-color); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; color: var(--text-muted); font-size: 0.85rem; display: flex; align-items: center; gap: 8px; }
.kanban-hint span { flex: 1; }

/* List styles (kept from original) */
.projects-list { display: flex; flex-direction: column; gap: 1.5rem; }
.project-card { background: var(--bg-surface); padding: 1.5rem; border-radius: 12px; box-shadow: var(--shadow); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; transition: all 0.2s; }
.project-card:hover { transform: translateY(-2px); border-color: var(--primary); }
.card-column { display: flex; flex-direction: column; gap: 4px; }
.card-column label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
.code-col { min-width: 80px; }
.main-col { flex: 2; min-width: 200px; }
.client-name { font-size: 0.9rem; color: var(--text-muted); }
.project-name { font-weight: bold; font-size: 1.05rem; color: var(--text-main); }
.meta-row { display: flex; gap: 0.5rem; margin-top: 4px; flex-wrap: wrap; }
.meta-chip { font-size: 0.72rem; padding: 2px 8px; border-radius: 10px; background: var(--bg-app); border: 1px solid var(--border-color); color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; }
.meta-chip.over-budget { color: #ef4444; border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.08); }

.date-col, .status-col { min-width: 120px; }
.actions-col { margin-left: auto; display: flex; gap: 0.5rem; }
.badge-code { font-family: monospace; background: var(--bg-app); padding: 4px 8px; border-radius: 4px; font-size: 0.85em; color: var(--text-muted); }
.badge-status { padding: 4px 12px; border-radius: 12px; font-size: 0.82em; font-weight: 600; background: var(--bg-app); color: var(--text-muted); width: fit-content; border: 1px solid var(--border-color); }
.badge-status.en-curso  { background: rgba(34, 197, 94, 0.15);  color: #4ade80; border-color: rgba(34, 197, 94, 0.3); }
.badge-status.completed { background: rgba(96, 165, 250, 0.15); color: #60a5fa; border-color: rgba(96, 165, 250, 0.3); }

.btn-primary, .btn-revert { background: var(--primary); color: white; border: none; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.btn-revert { background: #64748b; }
.btn-icon-danger { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-icon-success { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: #16a34a; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-revert:hover { background: #475569; }

.empty-state { text-align: center; padding: 3rem; background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border-color); color: var(--text-muted); }

@media (max-width: 640px) {
  .container { padding: 1rem; }
  .header { align-items: stretch; }
  .actions { width: 100%; justify-content: space-between; }
  .project-card { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .card-column { width: 100%; }
  .actions-col { width: 100%; margin-left: 0; justify-content: space-between; padding-top: 1rem; border-top: 1px solid var(--border-color); }
}
</style>
