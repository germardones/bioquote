<template>
  <div class="container">
    <div class="header">
      <h2>Proyectos en Curso</h2>
      <div class="actions">
          <button @click="router.push('/dashboard')" class="btn-volver">
            Volver
          </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Cargando proyectos...</div>

    <div v-else-if="projects.length > 0">
      <div class="projects-list">
         <!-- New Card Layout -->
         <div v-for="p in projects" :key="p.id" class="project-card">
            <div class="card-column code-col">
                <label>Código</label>
                <span class="badge-code">{{ p.codigo }}</span>
            </div>
            
            <div class="card-column main-col">
                <div class="client-name">{{ p.client_name }}</div>
                <div class="project-name">{{ p.name }}</div>
            </div>

            <div class="card-column date-col">
                <label>Inicio</label>
                <span>{{ formatFecha(p.updated_at || p.created_at) }}</span>
            </div>

            <div class="card-column status-col">
                <label>Estado</label>
                <span class="badge-status" :class="getStatusClass(p.status)">{{ p.status }}</span>
            </div>

            <div class="card-column actions-col">
                <button class="btn-icon-success" @click="finalizarProyecto(p)" title="Finalizar Proyecto" v-if="p.status !== 'Completed'">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="btn-icon-danger" @click="eliminarProyecto(p)" title="Eliminar Proyecto">
                    <i class="fa-solid fa-trash"></i>
                </button>
                <button class="btn-revert" @click="revertirProyecto(p)" title="Revertir a Borrador">
                    <i class="fa-solid fa-rotate-left"></i>
                </button>
                <button class="btn-primary" @click="verDetalle(p)" title="Gestionar Proyecto">
                    <i class="fa-solid fa-gear"></i>
                </button>
            </div>
         </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>No tienes proyectos en curso actualmente.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db, auth } from '../firebase/firebaseConfig'
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'

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
    
    // Sort and Filter: Show ONLY Active projects (En Curso, Completed)
    projects.value = data
        .filter(p => p.status === 'En Curso' || p.status === 'Completed')
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

const formatFecha = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return '-'
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(timestamp.toDate())
}

const verDetalle = (project) => {
    router.push(`/proyectos-en-curso/${project.id}/gestion`)
}

const getStatusClass = (status) => {
    if (!status) return ''
    return status.toLowerCase().replace(/\s+/g, '-')
}

const revertirProyecto = async (project) => {
    if (!confirm(`¿Estás seguro de que deseas revertir el proyecto "${project.name}" a borrador? Desaparecerá de esta lista.`)) {
        return
    }

    try {
        const projectRef = doc(db, 'projects', project.id)
        await updateDoc(projectRef, {
            status: 'Draft',
            updated_at: new Date()
        })
        
        // Remove from local list
        projects.value = projects.value.filter(p => p.id !== project.id)
        
    } catch (error) {
        console.error('Error al revertir proyecto:', error)
        alert('Hubo un error al revertir el proyecto.')
    }
}

const eliminarProyecto = async (project) => {
     if (!confirm(`ADVERTENCIA: ¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE el proyecto "${project.name}"?\n\nEsta acción no se puede deshacer.`)) {
         return
     }
 
     try {
         await deleteDoc(doc(db, 'projects', project.id))
         
         // Remove from local list
         projects.value = projects.value.filter(p => p.id !== project.id)
         
     } catch (error) {
         console.error('Error al eliminar proyecto:', error)
         alert('Hubo un error al eliminar el proyecto.')
     }
 }

 const finalizarProyecto = async (project) => {
     if (!confirm(`¿Deseas finalizar el proyecto "${project.name}"? Pasará a estado completado.`)) {
         return
     }
     try {
         const projectRef = doc(db, 'projects', project.id)
         await updateDoc(projectRef, {
             status: 'Completed',
             updated_at: new Date()
         })
         // Update local state to reflect change (or move to history if we want to hide it, 
         // but requirement was just to mark it. The filter shows 'En Curso' or 'Completed', so it stays visible but updated)
         const idx = projects.value.findIndex(p => p.id === project.id)
         if (idx !== -1) {
             projects.value[idx].status = 'Completed'
         }
     } catch (error) {
         console.error('Error al finalizar proyecto:', error)
         alert('Hubo un error al finalizar el proyecto.')
     }
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

/* Card Styles */
.projects-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.project-card {
    background: var(--bg-surface);
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 2rem;
    flex-wrap: wrap;
    transition: all 0.2s;
}

.project-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 20px rgba(0, 0, 0, 0.12);
    border-color: var(--primary);
}

.card-column {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.card-column label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    font-weight: 600;
}

.code-col {
    min-width: 80px;
}

.main-col {
    flex: 2; /* Takes most space */
    min-width: 200px;
}

.client-name {
    font-size: 0.9rem;
    color: var(--text-muted);
}

.project-name {
    font-weight: bold;
    font-size: 1.1rem;
    color: var(--text-main);
}

.date-col, .status-col {
    min-width: 120px;
}

.actions-col {
    margin-left: auto;
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.badge-code {
  font-family: monospace;
  background: var(--bg-app);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--text-muted);
}

.badge-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 500;
  background: var(--bg-app);
  color: var(--text-muted);
  width: fit-content;
}

.badge-status.en-curso { 
    background: rgba(21, 128, 61, 0.15); 
    color: #4ade80; 
    border: 1px solid rgba(21, 128, 61, 0.3);
}
.badge-status.completed { 
    background: rgba(30, 64, 175, 0.15); 
    color: #60a5fa; 
    border: 1px solid rgba(30, 64, 175, 0.3);
}

.btn-primary, .btn-revert {
  background-color: var(--primary);
  color: white;
  border: none;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  transition: background-color 0.2s;
  font-size: 1.1rem;
}

.btn-icon-danger {
    background: transparent;
    border: 1px solid #ef4444;
    color: #ef4444;
    width: 36px;
    height: 36px;
    padding: 0;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    transition: all 0.2s;
}

.btn-icon-danger:hover {
    background-color: #fef2f2;
    transform: scale(1.05);
}

.btn-primary:hover {
    background-color: var(--primary-hover);
}

.btn-revert {
    background-color: #64748b; /* Slate-500 for a neutral but solid "undo" action */
}

.btn-revert:hover {
    background-color: #475569; /* Slate-600 */
}

.btn-icon-success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #16a34a;
    width: 36px;
    height: 36px;
    padding: 0;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    transition: all 0.2s;
}

.btn-icon-success:hover {
    background-color: #f0fdf4;
    transform: scale(1.05);
}

/* Removed old btn-secondary styles as they are no longer used for the main actions */

.empty-state {
  text-align: center;
  padding: 3rem;
  background: var(--bg-surface);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .container {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .actions {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }

  .project-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .card-column {
    width: 100%;
    min-width: unset;
  }

  .actions-col {
    width: 100%;
    margin-left: 0;
    margin-top: 0.5rem;
  }

  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>
