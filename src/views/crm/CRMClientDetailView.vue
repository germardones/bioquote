<template>
  <div class="crm-client-detail">
    <!-- Header -->
    <div class="header">
      <h1>{{ cliente.nombre || 'Cargando...' }} <span class="rut-badge">{{ cliente.rut }}</span></h1>
      <button @click="router.back()" class="btn-volver">
         Volver
      </button>
    </div>

    <!-- Tabs Navigation -->
    <div class="tabs">
      <button 
        :class="['tab-btn', { active: activeTab === 'profile' }]"
        @click="activeTab = 'profile'"
      >
        <i class="fa-solid fa-address-card"></i> Perfil
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'history' }]"
        @click="activeTab = 'history'"
      >
        <i class="fa-solid fa-clock-rotate-left"></i> Trazabilidad
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'projects' }]"
        @click="activeTab = 'projects'"
      >
        <i class="fa-solid fa-briefcase"></i> Historial Comercial
      </button>
    </div>

    <!-- Content Area -->
    <div class="tab-content">
      
      <!-- Tab: Perfil (Edit Form) -->
      <div v-if="activeTab === 'profile'" class="fade-in">
        <div class="card form-grid">
           <!-- Reutilizando lógica de formulario de edición -->
           <div class="field full-width">
             <label>Etapa del Pipeline (Estado)</label>
             <select v-model="cliente.pipeline_stage" class="stage-select">
                <option v-for="stage in pipelineStages" :key="stage.value" :value="stage.value">
                    {{ stage.label }}
                </option>
             </select>
           </div>

           <div class="field">
             <label>Nombre Cliente / Empresa</label>
             <input v-model="cliente.nombre" type="text" />
             <p v-if="errores.nombre" class="error">{{ errores.nombre }}</p>
           </div>
           
           <div class="field">
             <label>Razón Social</label>
             <input v-model="cliente.razonSocial" type="text" />
           </div>

           <div class="field">
             <label>RUT</label>
             <input v-model="cliente.rut" type="text" disabled />
             <small>El RUT no se puede modificar.</small>
           </div>
           
           <div class="field">
             <label>Email Contacto</label>
             <input v-model="cliente.email" type="email" />
             <p v-if="errores.email" class="error">{{ errores.email }}</p>
           </div>

           <div class="field">
             <label>Teléfono / Contacto</label>
             <input v-model="cliente.contacto" type="text" />
           </div>

           <div class="field full-width">
             <label>Dirección</label>
             <input v-model="cliente.direccion" type="text" />
           </div>

           <div class="actions full-width">
              <button class="btn-save" @click="guardarCambios" :disabled="loading">
                <span v-if="loading"><i class="fa-solid fa-spinner fa-spin"></i> Guardando...</span>
                <span v-else><i class="fa-solid fa-floppy-disk"></i> Guardar Cambios</span>
              </button>
           </div>
        </div>
      </div>

      <!-- Tab: Trazabilidad -->
      <div v-if="activeTab === 'history'" class="fade-in">
         <HistoryTimeline :clientRut="rutParam" />
      </div>

      <!-- Tab: Proyectos -->
      <div v-if="activeTab === 'projects'" class="fade-in">
         <div class="projects-list">
            <div v-if="loadingProjects" class="loading">Cargando proyectos...</div>
            <div v-else-if="projects.length === 0" class="empty-state">
                Este cliente no tiene cotizaciones ni proyectos asociados.
            </div>
            
            <div v-else class="grid-projects">
                <div 
                    v-for="p in projects" 
                    :key="p.id" 
                    class="project-card"
                    @click="goToProject(p.id)"
                >
                    <div class="card-header-row">
                        <div class="p-status" :class="p.status.toLowerCase().replace(' ', '-')">
                            {{ p.status }}
                        </div>
                        <span v-if="p.total > 0 && (p.paidAmount >= p.total)" class="paid-badge-sm">
                            <i class="fa-solid fa-check"></i> Pagado
                        </span>
                    </div>

                    <h4>{{ p.name }}</h4>
                    <p class="p-desc">{{ p.description ? p.description.substring(0, 60) + '...' : 'Sin descripción' }}</p>
                    <div class="p-meta">
                        <span><i class="fa-regular fa-calendar"></i> {{ formatDate(p.created_at) }}</span>
                        <div class="financial-meta">
                            <span class="total-val"><i class="fa-solid fa-money-bill"></i> {{ formatCurrency(p.total) }}</span>
                            <span v-if="p.paidAmount > 0" class="paid-val">
                                (Pagado: {{ formatCurrency(p.paidAmount) }})
                            </span>
                        </div>
                    </div>
                </div>
            </div>
         </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../../firebase/firebaseConfig'
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore'
import HistoryTimeline from '../../components/crm/HistoryTimeline.vue'


const route = useRoute()
const router = useRouter()
const rutParam = route.params.rut

const activeTab = ref('profile')
const loading = ref(false)
const loadingProjects = ref(false)

const cliente = reactive({
    nombre: '',
    rut: '',
    email: '',
    telefono: '',
    direccion: '',
    razonSocial: '',
    pipeline_stage: 'lead'
})
// Fallback to local definition to fix crash
const pipelineStages = [
    { value: 'lead', label: 'Identificado (Lead)' },
    { value: 'contact', label: 'Primer Contacto' },
    { value: 'followup', label: 'En Seguimiento' },
    { value: 'meeting', label: 'Reunión/Demo' },
    { value: 'proposal', label: 'Propuesta/Cotización' },
    { value: 'closed_won', label: 'Cierre (Ganado)' },
    { value: 'closed_lost', label: 'Cierre (Perdido)' }
]

const proyectosRaw = ref([])
const projects = ref([])

// Helper for simple calc locally
const calculateTotal = (p) => {
    if (p.totalValue) return Number(p.totalValue)
    if (p.total) return Number(p.total)
    // Basic summation of items if available
    let sum = 0
    if (p.items && Array.isArray(p.items)) {
        p.items.forEach(i => {
           if(i.pricingMethod === 'fixed') sum += Number(i.fixedValue) || 0
           else sum += (Number(i.hours) * Number(i.rate || 25000))
        })
    }
    // Check parametric specs (support both English and Spanish keys)
    if (sum === 0 && p.specs) {
         // rough estimation fallback
         const s = p.specs
         const entities = Number(s.entity_count || s.entidades || 0)
         const roles = Number(s.role_count || s.roles || 0)
         const views = Number(s.view_count || s.vistas || 0)
         const apis = Number(s.api_count || s.apis || 0)
         
         const h = (entities * 4) + (roles * 2) + (views * 3) + (apis * 8)
         sum = h * 25000
    }
    return sum
}
const errores = reactive({})

// Utils
const formatDate = (timestamp) => {
    if(!timestamp) return '-'
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return d.toLocaleDateString('es-CL')
}
const formatCurrency = (val) => '$' + (val || 0).toLocaleString('es-CL')

// Fetch Client Data
onMounted(async () => {
    if (!rutParam) return
    
    // Fetch Cliente (from any project that has it)
    try {
        let q = query(collection(db, 'projects'), where('client_data.rut', '==', rutParam))
        let snapshot = await getDocs(q)
        
        // Fallback to legacy 'cliente.rut'
        if (snapshot.empty) {
            console.warn("Cliente no encontrado en estructura nueva, buscando legacy...")
            q = query(collection(db, 'projects'), where('cliente.rut', '==', rutParam))
            snapshot = await getDocs(q)
        }
        
        if (!snapshot.empty) {
            // Fill client data from first match
            // Handle both structures
            const docData = snapshot.docs[0].data()
            const data = docData.client_data || docData.cliente
            
            if (data) Object.assign(cliente, data)
            
            // Fill projects list
            projects.value = snapshot.docs.map(d => {
                const p = d.data()
                const paid = (p.payments || []).reduce((sum, pay) => sum + Number(pay.amount), 0)
                
                return { 
                    id: d.id, 
                    ...p,
                    total: calculateTotal(p), // Ensure total is calculated
                    paidAmount: paid
                }
            })
            proyectosRaw.value = snapshot.docs // Keep ref to docs for update
        } else {
             console.warn("Cliente no encontrado definitivamente.")
        }
    } catch (e) {
        console.error("Error loading client:", e)
    }
})

const guardarCambios = async () => {
    loading.value = true
    errores.nombre = !cliente.nombre ? 'Requerido' : ''
    
    // Basic validation
    if (errores.nombre) {
        loading.value = false
        return
    }

    try {
        // Update ALL projects for this client
        // Need to handle both legacy and new fields query to ensure we cover all docs
        
        // 1. Find docs with client_data.rut
        const q1 = query(collection(db, 'projects'), where('client_data.rut', '==', rutParam))
        const s1 = await getDocs(q1)
        
        // 2. Find docs with cliente.rut (Legacy)
        const q2 = query(collection(db, 'projects'), where('cliente.rut', '==', rutParam))
        const s2 = await getDocs(q2)
        
        // Combine unique docs
        const allDocs = new Map()
        s1.docs.forEach(d => allDocs.set(d.id, d))
        s2.docs.forEach(d => allDocs.set(d.id, d))
        
        const updates = Array.from(allDocs.values()).map(d => {
            const dataToSave = { ...cliente }
            // Ensure lead_start_date is set if not present
            if (!dataToSave.lead_start_date) {
                dataToSave.lead_start_date = new Date().toISOString()
                cliente.lead_start_date = dataToSave.lead_start_date // Update local
            }
            
            return updateDoc(d.ref, {
                client_data: dataToSave, // Always save to new structure
                client_name: cliente.nombre  // Keep sync
                // We don't delete 'cliente' legacy field to avoid breaking other things, but we rely on client_data going forward
            })
        })
        
        await Promise.all(updates)
        alert("Cliente actualizado correctamente")
        
        // Refetch to ensure UI is consistent? 
        // Or just rely on local state which is already updated.
    } catch (e) {
        console.error(e)
        alert("Error al guardar")
    } finally {
        loading.value = false
    }
}

const goToProject = (id) => {
    // Logic to determine where to go? 
    // Usually Detail View
    router.push({ name: 'ProjectDetail', params: { id } })
}

</script>

<style scoped>
.crm-client-detail {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.btn-back {
    background: none; border: none; cursor: pointer;
    color: var(--text-muted); font-size: 1rem;
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 1rem;
}
.btn-back:hover { color: var(--primary); }

.client-title h1 { margin: 0; font-size: 2rem; }
.rut-badge { 
    background: var(--bg-surface); 
    border: 1px solid var(--border-color);
    padding: 4px 10px; border-radius: 20px;
    font-size: 0.9rem; color: var(--text-muted);
}

/* Tabs */
.tabs {
    display: flex; gap: 1rem;
    border-bottom: 2px solid var(--border-color);
    margin-bottom: 2rem;
}

.tab-btn {
    background: none; border: none;
    padding: 1rem 1.5rem;
    font-size: 1rem; font-weight: 600;
    color: var(--text-muted);
    border-bottom: 3px solid transparent;
    cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; gap: 8px;
}

.tab-btn:hover { color: var(--text-main); }
.tab-btn.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
}

/* Content */
.card {
    background: var(--bg-surface);
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow);
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}
.full-width { grid-column: 1 / -1; }

.field label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
.field input { 
    width: 100%; padding: 10px; 
    border-radius: 6px; border: 1px solid var(--border-color);
    background: var(--input-bg); color: var(--text-main);
}
.field input:disabled { opacity: 0.6; cursor: not-allowed; }

.stage-select {
    width: 100%; padding: 10px;
    border-radius: 6px; border: 1px solid var(--border-color);
    background: var(--input-bg); color: var(--text-main);
    font-size: 1rem;
}

.btn-save {
    background: var(--primary); color: white;
    padding: 12px 24px; border-radius: 8px;
    border: none; font-size: 1rem; font-weight: 700;
    cursor: pointer; width: 100%;
}
.btn-save:hover { background: var(--primary-hover); }

/* Projects Grid */
.grid-projects {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
}
.project-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 12px; padding: 1.5rem;
    cursor: pointer; transition: all 0.2s;
}
.project-card:hover { transform: translateY(-4px); box-shadow: var(--shadow); border-color: var(--primary); }

.card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
}

.p-status {
    display: inline-block; padding: 4px 10px; border-radius: 12px;
    font-size: 0.8rem; font-weight: 700; text-transform: uppercase;
}
.p-status.en-curso { background: #e0f2fe; color: #0284c7; }
.p-status.completed { background: #dcfce7; color: #16a34a; }
.p-status.pending { background: #fefce8; color: #ca8a04; }

.paid-badge-sm {
    background: #dcfce7; color: #16a34a;
    font-size: 0.75rem; padding: 2px 8px; border-radius: 10px;
    font-weight: bold; display: flex; align-items: center; gap: 4px;
}

.p-desc { color: var(--text-muted); font-size: 0.9rem; line-height: 1.4; margin-bottom: 0.5rem; }
.p-meta { 
    margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);
    display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 600;
}

.financial-meta {
    display: flex; flex-direction: column; align-items: flex-end;
}
.total-val { color: var(--text-main); }
.paid-val { color: #16a34a; font-size: 0.8rem; margin-top: 2px; }

@media(max-width: 640px) {
    .form-grid { grid-template-columns: 1fr; }
    .tabs { overflow-x: auto; }
}
</style>
