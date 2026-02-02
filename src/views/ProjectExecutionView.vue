<template>
  <div class="container">
    <div class="header">
      <h2>Gestión de Ejecución: {{ project?.codigo }}</h2>
      <button @click="router.push('/proyectos-en-curso')" class="btn-volver" :disabled="loading">
        <span class="icon">⬅️</span> Volver
      </button>
    </div>

    <div v-if="loading" class="loading">Cargando datos...</div>

    <div v-else-if="project" class="content">
      <div class="project-info">
        <p><strong>Cliente:</strong> {{ project.client_name }}</p>
        <p><strong>Proyecto:</strong> {{ project.name }}</p>
      </div>

      <div class="list-header">
          <h3>Planificación de Items</h3>
          <button class="btn-add" @click="addNewItem">+ Agregar Item</button>
      </div>

      <div class="execution-list">
          <div v-if="items.length === 0" class="empty-msg">No hay items para gestionar en este proyecto.</div>
          
          <div v-for="(item, idx) in items" :key="item.id || idx" class="item-card">
              <div class="card-left">
                  <div class="item-description-group">
                      <label>Item / Descripción</label>
                      <input 
                        v-if="item.isNew" 
                        v-model="item.description" 
                        placeholder="Descripción del item"
                        class="edit-input big"
                        @change="updateItem(idx)"
                      />
                      <strong v-else class="item-title">{{ item.description }}</strong>
                      
                      <div class="subtext">
                          <span v-if="item.pricingMethod === 'fixed'" class="badge-fixed">Fijo</span>
                          <span v-else class="badge-hourly">
                              <input 
                                v-if="item.isNew" 
                                type="number" 
                                v-model.number="item.hours" 
                                class="edit-input-sm" 
                                placeholder="h"
                                @change="updateItem(idx)"
                              />
                              <span v-else>{{ item.hours }}h</span>
                          </span>
                      </div>
                  </div>
              </div>

              <div class="card-center">
                  <div class="field-group">
                      <label>Responsable</label>
                       <select v-model="item.execution.workerId" @change="updateItem(idx)" class="worker-select">
                           <option value="">Sin asignar</option>
                           <option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</option>
                       </select>
                  </div>

                  <div class="field-group">
                      <label>Inicio / Fin</label>
                      <div class="dates-input">
                        <input type="date" v-model="item.execution.startDate" @change="updateItem(idx)" title="Inicio">
                        <span>→</span>
                        <input type="date" v-model="item.execution.endDate" @change="updateItem(idx)" title="Fin">
                    </div>
                  </div>
              </div>

              <div class="card-right">
                  <div class="field-group progress-group">
                      <label>Avance</label>
                      <div class="progress-wrapper">
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            v-model.number="item.execution.progress" 
                            :disabled="item.tasks && item.tasks.length > 0"
                            @change="updateItem(idx)"
                        >
                        <span class="progress-val">{{ item.execution.progress }}%</span>
                        <span v-if="item.tasks && item.tasks.length > 0" class="auto-badge" title="Calculado automáticamente por tareas">🤖</span>
                    </div>
                  </div>

                  <div class="actions-group">
                    <span v-if="item.saved" class="saved-indicator">💾</span>
                    <button class="btn-icon kanban" @click="goToKanban(item)" title="Ver Tablero Kanban">📋 Kanban</button>
                    <button v-if="item.isNew" class="btn-icon delete" @click="removeItem(idx)">🗑️</button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase/firebaseConfig'
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id

const loading = ref(true)
const project = ref(null)
const items = ref([])
const workers = ref([])

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
            project.value = { id: snap.id, codigo: snap.id.substring(0,8).toUpperCase(), ...data }
            
            let execItems = data.execution_items || []
            
            if (execItems.length === 0) {
                 if (data.specs?.custom_items && data.specs.custom_items.length > 0) {
                     execItems = data.specs.custom_items.map(i => ({...i}))
                 } else if (data.specs) {
                     const specs = data.specs
                     const now = Date.now()
                     const getId = (prefix) => prefix + '_' + now + '_' + Math.floor(Math.random() * 1000)

                     if (Number(specs.entity_count || specs.entidades) > 0) execItems.push({ 
                        id: getId('ent'), 
                        description: `Desarrollo de ${specs.entity_count || specs.entidades} Entidades`, 
                        hours: (specs.entity_count || specs.entidades) * 4, 
                        pricingMethod: 'hourly' 
                     })
                     if (Number(specs.role_count || specs.roles) > 0) execItems.push({ 
                        id: getId('rol'), 
                        description: `Configuración de ${specs.role_count || specs.roles} Roles`, 
                        hours: (specs.role_count || specs.roles) * 2, 
                        pricingMethod: 'hourly' 
                     })
                     if (Number(specs.view_count || specs.vistas) > 0) execItems.push({ 
                        id: getId('vis'), 
                        description: `Desarrollo de ${specs.view_count || specs.vistas} Vistas`, 
                        hours: (specs.view_count || specs.vistas) * 3, 
                        pricingMethod: 'hourly' 
                     })
                     if (Number(specs.api_count || specs.apis) > 0) execItems.push({ 
                        id: getId('api'), 
                        description: `Integración de ${specs.api_count || specs.apis} APIs`, 
                        hours: (specs.api_count || specs.apis) * 8, 
                        pricingMethod: 'hourly' 
                     })
                 }
            }
            
            items.value = execItems.map(item => ({
                ...item,
                execution: item.execution || {
                    workerId: '',
                    startDate: '',
                    endDate: '',
                    progress: 0
                },
                saved: !!data.execution_items
            }))
            // Reset saved flag for UI animation
            items.value.forEach(i => i.saved = false)
        }
    } catch (e) {
        console.error("Error loading project", e)
    }
}

const addNewItem = () => {
    const newItem = {
        id: 'new_' + Date.now(),
        description: '',
        hours: 0,
        pricingMethod: 'hourly',
        execution: {
            workerId: '',
            startDate: '',
            endDate: '',
            progress: 0
        },
        isNew: true, 
        saved: false
    }
    items.value.push(newItem)
}

const removeItem = async (idx) => {
    if (!confirm('¿Eliminar este item?')) return
    items.value.splice(idx, 1)
    await saveAllItems()
}

const updateItem = async (idx) => {
    // Optimistic update locally
    const item = items.value[idx]
    await saveAllItems(item)
}

const saveAllItems = async (itemToFlash = null) => {
    try {
        const docRef = doc(db, 'projects', projectId)
        
        const cleanItems = items.value.map(i => {
           const { saved, isNew, ...data } = i
           return data 
        })

        await updateDoc(docRef, {
            "execution_items": cleanItems,
            updated_at: new Date()
        })
        
        if (itemToFlash) {
            itemToFlash.saved = true
            setTimeout(() => itemToFlash.saved = false, 2000)
        }
        
    } catch (e) {
        console.error("Error saving execution update", e)
        alert("Error al guardar cambios")
    }
}

const goToKanban = async (item) => {
    await saveAllItems()
    router.push(`/proyectos-en-curso/${projectId}/kanban/${item.id}`)
}
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header, .list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.list-header {
    margin-bottom: 1rem;
}

.project-info {
    background: var(--bg-surface);
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow);
}

/* Card Layout Styles */
.execution-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.item-card {
    background: var(--bg-surface);
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
    display: flex;
    flex-wrap: wrap; /* responsive wrap */
    gap: 2rem;
    align-items: center;
    transition: background-color 0.3s, border-color 0.3s;
}

.card-left {
    flex: 2; /* wide description */
    min-width: 250px;
}

.card-center {
    flex: 2;
    min-width: 300px; /* Increased to accommodate dates */
    display: flex;
    flex-direction: column; /* Stack responsble and dates vertically to avoid overlap */
    gap: 1rem;
    align-items: flex-start;
}

.card-right {
    flex: 2;
    min-width: 300px;
    display: flex;
    flex-direction: column; /* Stack progress and actions */
    gap: 1rem;
    align-items: flex-end; /* Align to right */
    justify-content: center;
}

.field-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%; /* Ensure full width */
}

/* ... existing styles ... */

.progress-group {
    align-items: flex-end; /* Align label to right matches content */
    width: auto;
}

.actions-group {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-left: auto; /* Push to right */
}

.field-group label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.05em;
}

.item-title {
    font-size: 1.1rem;
    color: var(--text-main);
    font-weight: 700;
}

.subtext {
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.badge-fixed {
    background: rgba(3, 105, 161, 0.15);
    color: #38bdf8;
    font-size: 0.75rem;
    padding: 3px 8px;
    border-radius: 6px;
    font-weight: 600;
    border: 1px solid rgba(3, 105, 161, 0.3);
}

.badge-hourly {
    color: var(--text-muted);
    font-size: 0.9rem;
}

.worker-select {
    padding: 8px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    min-width: 150px;
    background: var(--input-bg);
    color: var(--text-main);
}

.dates-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.dates-input input {
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.9rem;
    background: var(--input-bg);
    color: var(--text-main);
}

.progress-wrapper {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    background: var(--bg-app);
    padding: 8px 12px;
    border-radius: 20px;
}

.progress-val {
    min-width: 2.5rem;
    font-weight: bold;
    color: var(--primary);
    text-align: right;
}

.auto-badge {
    font-size: 1.2rem;
    cursor: help;
}

.actions-group {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-left: auto;
}

.btn-add {
    background-color: var(--primary);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn-add:hover {
    background-color: #006e53;
}

.empty-msg {
    text-align: center;
    padding: 3rem;
    background: var(--bg-app);
    border-radius: 12px;
    color: var(--text-muted);
    font-style: italic;
}

.edit-input {
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--input-bg);
    color: var(--text-main);
}

.edit-input.big {
    width: 100%;
    font-size: 1rem;
}

.edit-input-sm {
    width: 60px;
    padding: 2px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    text-align: center;
    background: var(--input-bg);
    color: var(--text-main);
}

.btn-icon.delete {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
    cursor: pointer;
    font-size: 1.1rem;
    padding: 8px;
    border-radius: 8px;
    transition: all 0.2s;
}

.btn-icon.delete:hover {
    background: rgba(239, 68, 68, 0.25);
    transform: scale(1.05);
}

.btn-icon.kanban {
    background: var(--bg-app);
    border: 1px solid var(--border-color);
    color: var(--text-main);
    cursor: pointer;
    font-weight: 600;
    padding: 8px 12px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
}

.btn-icon.kanban:hover {
    background: var(--border-color);
}

.saved-indicator {
    animation: fadeOut 2s forwards;
    font-size: 1.2rem;
}

@keyframes fadeOut {
    0% { opacity: 1; }
    80% { opacity: 1; }
    100% { opacity: 0; }
}

input[type=range]:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Specific styles to make cards full width stacked */
.execution-list {
    width: 100%;
}
</style>
