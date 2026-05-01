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

        <div class="email-section">
          <span class="email-section-label">
            <i class="fa-solid fa-envelope"></i> Email
            <span v-if="!lead.email" class="no-email-note">— sin email registrado</span>
          </span>
          <div class="email-steps">
            <button
              v-for="step in EMAIL_STEPS"
              :key="step.key"
              :class="['btn-email-step', emailStepStatus(lead, step.key)]"
              :disabled="emailStepStatus(lead, step.key) !== 'activo'"
              :title="step.label"
              @click="abrirEmailModal(lead, step.key)"
            >
              <i :class="emailStepStatus(lead, step.key) === 'enviado' ? 'fa-solid fa-check' : step.icon"></i>
              {{ step.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <EmailPreviewModal
    v-if="emailModal"
    :lead="emailModal.lead"
    :asunto="emailModal.asunto"
    :cuerpo="emailModal.cuerpo"
    :sending="enviando"
    @close="emailModal = null"
    @confirm="confirmarEnvio"
  />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../firebase/firebaseConfig'
import { collection, getDocs, doc, updateDoc, deleteDoc, orderBy, query } from 'firebase/firestore'
import EmailPreviewModal from '../components/EmailPreviewModal.vue'
import { getTemplateFor, enviarEmail } from '../services/emailService'

const router = useRouter()
const leads = ref([])
const loading = ref(true)
const filtroEstado = ref('')
const filtroSector = ref('')
const emailModal = ref(null)
const enviando = ref(false)

const EMAIL_STEPS = [
  { key: 'nuevo',        label: 'Contacto inicial', icon: 'fa-solid fa-envelope' },
  { key: 'email_enviado', label: 'Seg. 3 días',     icon: 'fa-solid fa-rotate-right' },
  { key: 'seg_3d',       label: 'Seg. 7 días',      icon: 'fa-solid fa-rotate-right' },
  { key: 'seg_5d',       label: 'Seg. 14 días',     icon: 'fa-solid fa-rotate-right' },
]

const ESTADO_ORDEN = ['nuevo', 'email_enviado', 'seg_3d', 'seg_5d', 'seg_14d']

const emailStepStatus = (lead, stepKey) => {
  if (!lead.email) return 'sin-email'
  const leadIdx = ESTADO_ORDEN.indexOf(lead.estado)
  const stepIdx = ESTADO_ORDEN.indexOf(stepKey)
  if (leadIdx === -1) return 'activo'    // estados CRM → todos los botones disponibles
  if (leadIdx > stepIdx) return 'enviado'
  if (leadIdx === stepIdx) return 'activo'
  return 'pendiente'
}

const abrirEmailModal = (lead, stepKey) => {
  const template = getTemplateFor(lead, stepKey)
  if (!template) return
  emailModal.value = {
    lead: { ...lead, contacto: lead.nombre },
    stepKey,
    asunto: template.asunto,
    cuerpo: template.cuerpo
  }
}

const confirmarEnvio = async ({ asunto, cuerpo }) => {
  if (!emailModal.value) return
  enviando.value = true
  try {
    const { lead, stepKey } = emailModal.value
    const nuevoEstado = await enviarEmail(lead, asunto, cuerpo, stepKey)
    const found = leads.value.find(l => l.id === lead.id)
    if (found) found.estado = nuevoEstado
    emailModal.value = null
  } catch (err) {
    alert('Error al enviar email: ' + err.message)
  } finally {
    enviando.value = false
  }
}

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

.email-section {
  border-top: 1px solid var(--border-color);
  padding-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.email-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.no-email-note {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  font-style: italic;
}

.email-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.35rem;
}

.btn-email-step {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.35rem 0.3rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-app);
  color: var(--text-muted);
  cursor: default;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  line-height: 1.2;
  text-align: center;
}

.btn-email-step i { font-size: 0.75rem; }

.btn-email-step.activo {
  background: rgba(59, 130, 246, 0.12);
  border-color: #3b82f6;
  color: #3b82f6;
  cursor: pointer;
}
.btn-email-step.activo:hover {
  background: rgba(59, 130, 246, 0.22);
}

.btn-email-step.enviado {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.4);
  color: #10b981;
  opacity: 0.7;
}

.btn-email-step.pendiente,
.btn-email-step.sin-email {
  opacity: 0.35;
}
</style>
