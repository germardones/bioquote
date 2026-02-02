<template>
  <div class="project-container">
    <div class="header">
      <h2>Detalle del Proyecto</h2>
      <div class="actions">
        <span v-if="project && project.codigo" class="codigo-cotizacion">ID: {{ project.codigo }}</span>
       <button @click="router.back()" class="btn-volver" :disabled="loading">
         <span class="icon">⬅️</span> Volver
       </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Cargando detalles...</div>

    <div v-else-if="project" class="card resumen">
      <div class="status-bar">
        <span class="status-badge" :class="getStatusClass(project.status)">{{ project.status }}</span>
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

      <h3>Evaluación Financiera</h3>
      <div class="financials-grid">
        <div class="fin-item">
          <span>Horas Mercado:</span>
          <strong>{{ project.financials?.estimated_hours_market || 0 }} h</strong>
        </div>
        <div class="fin-item">
          <span>Horas Reales:</span>
          <strong>{{ project.financials?.estimated_hours_real || 0 }} h</strong>
        </div>
        
        <!-- Mostrar info financiera sensible solo si es el dueño o admin (asumimos dueño por ahora) -->
        <div class="fin-item highlight">
          <span>Costo Interno:</span>
          <strong>${{ (project.financials?.internal_cost || 0).toLocaleString() }}</strong>
        </div>
        
        <div class="fin-item highlight">
           <span>Margen Bruto:</span>
           <strong>
             ${{ (project.financials?.projected_margin || 0).toLocaleString() }}
             <small>({{ calcularMargen(project.financials) }}%)</small>
           </strong>
        </div>
      </div>

      <div class="total-section">
        <h3>Precio Venta</h3>
        <p class="total-price">${{ (project.financials?.quoted_price || 0).toLocaleString() }}</p>
        <p class="disclaimer">+ IVA</p>
      </div>

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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const project = ref(null)
const loading = ref(true)

const projectId = route.params.id

onMounted(async () => {
  if (!projectId) return
  try {
    const docRef = doc(db, 'projects', projectId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      project.value = {
        id: docSnap.id,
        codigo: docSnap.id.substring(0, 8).toUpperCase(),
        ...docSnap.data()
      }
    }
  } catch (e) {
    console.error("Error loading project", e)
  } finally {
    loading.value = false
  }
})

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

const getStatusClass = (status) => {
    if (!status) return ''
    return status.toLowerCase().replace(/\s+/g, '-')
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
</style>
