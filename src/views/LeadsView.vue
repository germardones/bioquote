<template>
  <div class="container fade-in">
    <div class="header-row">
      <div class="header-left">
        <button @click="router.push('/dashboard')" class="btn-back">
          <i class="fa-solid fa-arrow-left"></i> Dashboard
        </button>
        <h2><i class="fa-solid fa-bullseye"></i> Leads - BioBioCode.cl</h2>
      </div>
      <div class="filters">
        <select v-model="filtroEstado" class="filter-select">
          <option value="">Todos</option>
          <option value="nuevo">Nuevo</option>
          <option value="contactado">Contactado</option>
          <option value="calificado">Calificado</option>
          <option value="descartado">Descartado</option>
        </select>
        <select v-model="filtroSector" class="filter-select">
          <option value="">Todos los sectores</option>
          <option value="industrial">Industrial</option>
          <option value="logistica">Logística</option>
          <option value="activos">Activos Críticos</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <i class="fa-solid fa-spinner fa-spin"></i> Cargando leads...
    </div>

    <div v-else-if="leadsFiltrados.length === 0" class="empty-state">
      <i class="fa-solid fa-inbox"></i>
      <p>No hay leads con estos filtros.</p>
    </div>

    <div v-else class="leads-grid">
      <div
        v-for="lead in leadsFiltrados"
        :key="lead.id"
        class="lead-card"
        :class="lead.estado"
      >
        <div class="lead-header">
          <div class="lead-identity">
            <span class="lead-name">{{ lead.nombre }}</span>
            <span class="lead-company">{{ lead.empresa }}</span>
          </div>
          <span class="sector-badge" :class="lead.sector">{{ sectorLabel(lead.sector) }}</span>
        </div>

        <p class="lead-message">{{ lead.mensaje }}</p>

        <div class="lead-footer">
          <span class="lead-date">{{ formatDate(lead.created_at) }}</span>
          <div class="estado-control">
            <select
              :value="lead.estado"
              @change="cambiarEstado(lead.id, $event.target.value)"
              class="estado-select"
              :class="lead.estado"
            >
              <option value="nuevo">Nuevo</option>
              <option value="contactado">Contactado</option>
              <option value="calificado">Calificado</option>
              <option value="descartado">Descartado</option>
            </select>
          </div>
        </div>

        <div class="lead-actions">
          <button @click="convertirACliente(lead)" class="btn-action btn-convert" title="Convertir a cliente">
            <i class="fa-solid fa-user-plus"></i> Convertir a cliente
          </button>
          <button @click="eliminarLead(lead.id)" class="btn-action btn-delete" title="Eliminar lead">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../firebase/firebaseConfig'
import { collection, getDocs, doc, updateDoc, deleteDoc, orderBy, query } from 'firebase/firestore'

const router = useRouter()
const leads = ref([])
const loading = ref(true)
const filtroEstado = ref('')
const filtroSector = ref('')

onMounted(async () => {
  try {
    const q = query(collection(db, 'leads'), orderBy('created_at', 'desc'))
    const snapshot = await getDocs(q)
    leads.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error cargando leads:', err)
  } finally {
    loading.value = false
  }
})

const leadsFiltrados = computed(() => {
  return leads.value.filter(l => {
    const matchEstado = !filtroEstado.value || l.estado === filtroEstado.value
    const matchSector = !filtroSector.value || l.sector === filtroSector.value
    return matchEstado && matchSector
  })
})

const sectorLabel = (sector) => {
  const map = { industrial: 'Industrial', logistica: 'Logística', activos: 'Activos' }
  return map[sector] || sector
}

const formatDate = (ts) => {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const cambiarEstado = async (id, nuevoEstado) => {
  try {
    await updateDoc(doc(db, 'leads', id), { estado: nuevoEstado })
    const lead = leads.value.find(l => l.id === id)
    if (lead) lead.estado = nuevoEstado
  } catch (err) {
    console.error('Error actualizando estado:', err)
  }
}

const eliminarLead = async (id) => {
  if (!confirm('¿Eliminar este lead? Esta acción no se puede deshacer.')) return
  try {
    await deleteDoc(doc(db, 'leads', id))
    leads.value = leads.value.filter(l => l.id !== id)
  } catch (err) {
    console.error('Error eliminando lead:', err)
  }
}

const convertirACliente = (lead) => {
  router.push({
    path: '/clientes',
    query: {
      nombre: lead.nombre,
      empresa: lead.empresa,
      sector: lead.sector,
      leadId: lead.id
    }
  })
}
</script>

<style scoped>
.container { width: 100%; max-width: 1400px; margin: 0 auto; padding: 2rem; }
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
.header-row h2 { font-size: 1.6rem; font-weight: 700; display: flex; align-items: center; gap: 0.6rem; }
.filters { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.filter-select {
  background: var(--bg-surface);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 4rem;
  color: var(--text-muted);
  font-size: 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.empty-state i { font-size: 2.5rem; opacity: 0.4; }

.leads-grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
}

.lead-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border-left: 4px solid var(--border-color);
}
.lead-card:hover { transform: translateY(-3px); box-shadow: var(--shadow); }
.lead-card.nuevo { border-left-color: #3b82f6; }
.lead-card.contactado { border-left-color: #f59e0b; }
.lead-card.calificado { border-left-color: #10b981; }
.lead-card.descartado { border-left-color: #6b7280; opacity: 0.6; }

.lead-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
.lead-identity { display: flex; flex-direction: column; gap: 0.2rem; }
.lead-name { font-weight: 700; font-size: 1rem; color: var(--text-main); }
.lead-company { font-size: 0.8rem; color: var(--text-muted); }

.sector-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.sector-badge.industrial { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.sector-badge.logistica { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.sector-badge.activos { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }

.lead-message {
  font-size: 0.875rem;
  color: var(--text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lead-footer { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.lead-date { font-size: 0.75rem; color: var(--text-muted); }

.estado-select {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-main);
  cursor: pointer;
}
.estado-select.nuevo { color: #3b82f6; }
.estado-select.contactado { color: #f59e0b; }
.estado-select.calificado { color: #10b981; }
.estado-select.descartado { color: #6b7280; }

.header-left { display: flex; align-items: center; gap: 1rem; }
.btn-back {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}
.btn-back:hover { color: var(--text-main); border-color: var(--text-muted); }

.lead-actions { display: flex; gap: 0.5rem; }
.btn-action {
  flex: 1;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.4rem 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  transition: opacity 0.2s;
}
.btn-action:hover { opacity: 0.85; }
.btn-convert { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.btn-delete { flex: 0; background: rgba(239, 68, 68, 0.12); color: #ef4444; padding: 0.4rem 0.6rem; }
</style>
