<template>
  <div class="container">
    <div class="header">
      <h2>Mis Cotizaciones</h2>
      <div class="actions">
        <button @click="router.push('/dashboard')" class="btn-volver" :disabled="loading">
          <span class="icon">⬅️</span> Volver
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Cargando cotizaciones...</div>

    <div v-else-if="projects.length > 0">
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
            <tr v-for="p in projects" :key="p.id">
              <td><span class="badge-code">{{ p.codigo }}</span></td>
              <td>{{ p.client_name }}</td>
              <td>{{ p.name }}</td>
              <td>{{ formatFecha(p.created_at) }}</td>
              <td class="monto">${{ (p.financials?.quoted_price || 0).toLocaleString() }}</td>
              <td>
                <span class="badge-status" :class="getStatusClass(p.status)">{{ p.status }}</span>
              </td>
              <td class="actions-cell">
                <button class="btn-icon-danger" title="Eliminar" @click="eliminarCotizacion(p)">
                    <i class="fa-solid fa-trash"></i>
                </button>
                <button v-if="p.status === 'Draft'" class="btn-icon-edit" title="Editar" @click="editarCotizacion(p)">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-icon-view" title="Ver detalle" @click="verDetalle(p)">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button 
                  v-if="p.status === 'Draft'" 
                  class="btn-icon-success" 
                  title="Aceptar Cotización" 
                  @click="aceptarCotizacion(p)"
                >
                  <i class="fa-solid fa-check"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>No tienes cotizaciones activas.</p>
      <button @click="router.push('/cotizar')" class="btn-crear">Crear Nueva Cotización</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db, auth } from '../firebase/firebaseConfig'
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore'

const router = useRouter()
const projects = ref([])
const loading = ref(true)

onMounted(async () => {
  await fetchProjects()
})

const fetchProjects = async () => {
  try {
    const user = auth.currentUser
    if (!user) return

    const q = query(
      collection(db, 'projects'),
      where('owner_uid', '==', user.uid)
    )

    const snapshot = await getDocs(q)
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      codigo: doc.id.substring(0, 8).toUpperCase(),
      ...doc.data()
    }))
    
    // Sort and Filter: Show only NON-active projects (Draft, Sent, Approved, Rejected)
    // Assuming 'En Curso', 'Completed', etc. are Active.
    // Simplifying: Filter OUT 'En Curso'
    projects.value = data
        .filter(p => p.status !== 'En Curso' && p.status !== 'Completed')
        .sort((a, b) => {
            const tA = a.created_at?.seconds || 0
            const tB = b.created_at?.seconds || 0
            return tB - tA
        })

  } catch (error) {
    console.error('Error fetching projects:', error)
  } finally {
    loading.value = false
  }
}

const eliminarCotizacion = async (project) => {
  if (!confirm(`¿Estás seguro de ELIMINAR la cotización "${project.codigo}"? Esta acción no se puede deshacer.`)) return

  try {
    await deleteDoc(doc(db, 'projects', project.id))
    projects.value = projects.value.filter(p => p.id !== project.id)
  } catch (error) {
    console.error('Error eliminando cotización:', error)
    alert('Error al eliminar la cotización.')
  }
}

const editarCotizacion = (project) => {
    // Redirigir a una vista de edición o al wizard con los datos cargados.
    // Por ahora, asumiremos que existe una ruta de edición o reutilizamos el wizard.
    // Si no existe ruta específica, alertar o redirigir al wizard (ajustar según router).
    // router.push(`/cotizar?edit=${project.id}`)
    // O si es "Editar Cliente" como vimos antes:
    router.push(`/editar-cliente/${project.id}`) 
}

const aceptarCotizacion = async (project) => {
  if (!confirm(`¿Estás seguro de aceptar la cotización ${project.codigo}? Pasará a estado "En Curso".`)) return

  try {
    const docRef = doc(db, 'projects', project.id)
    await updateDoc(docRef, {
      status: 'En Curso',
      updated_at: new Date()
    })
    
    // Remove from local list as it moved to active projects
    projects.value = projects.value.filter(p => p.id !== project.id)
    alert('Cotización aceptada y movida a Proyectos en Curso.')
    
  } catch (error) {
    console.error('Error actualizando estado:', error)
    alert('Hubo un error al actualizar el estado.')
  }
}

const formatFecha = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return '-'
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(timestamp.toDate())
}

const verDetalle = (project) => {
    router.push(`/proyectos/${project.id}`)
}

const getStatusClass = (status) => {
    if (!status) return ''
    return status.toLowerCase().replace(/\s+/g, '-')
}
</script>

<style scoped>
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-bottom: 1rem;
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.projects-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-surface);
  /* border-radius removed here as it's on wrapper for proper scroll */
  /* border: 1px solid var(--border-color); */
  min-width: 800px; /* Force scroll on small screens */
}

th, td {
  padding: 1.25rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
  transition: background-color 0.3s, color 0.3s;
}

th {
  background-color: var(--bg-app);
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.badge-code {
  font-family: monospace;
  background: var(--bg-app);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.9em;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}

.monto {
  font-weight: 800;
  color: var(--primary);
  font-size: 1.1rem;
}

.badge-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 600;
  background: var(--bg-app);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  display: inline-block;
  white-space: nowrap;
}

.badge-status.draft { 
    background: rgba(3, 105, 161, 0.15); 
    color: #38bdf8; 
    border-color: rgba(3, 105, 161, 0.3);
}
.badge-status.sent { 
    background: rgba(217, 119, 6, 0.15); 
    color: #fbbf24; 
    border-color: rgba(217, 119, 6, 0.3);
}
.badge-status.approved { 
    background: rgba(21, 128, 61, 0.15); 
    color: #4ade80; 
    border-color: rgba(21, 128, 61, 0.3);
}
.badge-status.rejected { 
    background: rgba(153, 27, 27, 0.15); 
    color: #f87171; 
    border-color: rgba(153, 27, 27, 0.3);
}

.actions-cell {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

/* Base icon button style */
.btn-icon-danger, .btn-icon-edit, .btn-icon-view, .btn-icon-success {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    transition: all 0.2s;
    background: white;
}

.btn-icon-danger {
    color: #ef4444;
    border-color: #fca5a5;
}
.btn-icon-danger:hover {
    background-color: #fef2f2;
    transform: scale(1.05);
}

.btn-icon-edit {
    color: #f59e0b;
    border-color: #fcd34d;
}
.btn-icon-edit:hover {
    background-color: #fffbeb;
    transform: scale(1.05);
}

.btn-icon-view {
    color: #3b82f6;
    border-color: #93c5fd;
}
.btn-icon-view:hover {
    background-color: #eff6ff;
    transform: scale(1.05);
}

.btn-icon-success {
    color: #10b981;
    border-color: #6ee7b7;
}
.btn-icon-success:hover {
    background-color: #ecfdf5;
    transform: scale(1.05);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: var(--bg-surface);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .container { padding: 1rem; }
  .header { flex-direction: column; align-items: stretch; gap: 1rem; }
  .btn-volver { width: 100%; }
}
</style>
