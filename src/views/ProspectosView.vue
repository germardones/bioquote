<template>
  <div class="container fade-in">

    <!-- Header -->
    <div class="header-row">
      <div class="header-left">
        <button @click="router.push('/dashboard')" class="btn-back">
          <i class="fa-solid fa-arrow-left"></i> Dashboard
        </button>
        <h2><i class="fa-solid fa-crosshairs"></i> Prospectos</h2>
      </div>
      <div class="header-right">
        <select v-model="filtroEstado" class="filter-select">
          <option value="">Todos los estados</option>
          <option value="nuevo">Nuevo</option>
          <option value="email_enviado">Email enviado</option>
          <option value="seg_3d">Seguimiento día 3</option>
          <option value="seg_5d">Seguimiento día 5</option>
          <option value="seg_14d">Seguimiento día 14</option>
          <option value="respondio">Respondió</option>
          <option value="reunion_agendada">Reunión agendada</option>
          <option value="no_interesado">No interesado</option>
        </select>
      </div>
    </div>

    <!-- Enviar hoy -->
    <div v-if="enviarHoy.length > 0" class="enviar-hoy-section">
      <div class="enviar-hoy-title">
        <i class="fa-solid fa-circle-exclamation"></i>
        Enviar hoy
        <span class="enviar-hoy-count">{{ enviarHoy.length }}</span>
      </div>
      <div class="enviar-hoy-chips">
        <div v-for="lead in enviarHoy" :key="lead.id" class="hoy-chip">
          <div class="hoy-chip-info">
            <span class="hoy-chip-empresa">{{ lead.empresa }}</span>
            <span class="estado-badge" :class="lead.estado">{{ estadoLabel(lead.estado) }}</span>
          </div>
          <button @click="iniciarEnvio(lead)" class="btn-chip-send">
            <i class="fa-solid fa-paper-plane"></i> Enviar
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <i class="fa-solid fa-spinner fa-spin"></i> Cargando prospectos...
    </div>

    <!-- Empty -->
    <div v-else-if="prospectosFiltrados.length === 0" class="empty-state">
      <i class="fa-solid fa-inbox"></i>
      <p>No hay prospectos con estos filtros.</p>
    </div>

    <!-- Tabla -->
    <div v-else class="table-wrapper">
      <table class="prospects-table">
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Ciudad</th>
            <th>Rubro</th>
            <th>Contacto</th>
            <th>Estado</th>
            <th>Último contacto</th>
            <th class="th-actions">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lead in prospectosFiltrados" :key="lead.id" :class="{ 'row-final': esEstadoFinal(lead.estado) }">
            <td>
              <div class="empresa-cell">
                <span class="empresa-nombre">{{ lead.empresa }}</span>
                <a v-if="lead.linkedin" :href="lead.linkedin" target="_blank" class="linkedin-link" title="LinkedIn">
                  <i class="fa-brands fa-linkedin"></i>
                </a>
              </div>
            </td>
            <td>{{ lead.ciudad || '—' }}</td>
            <td>{{ lead.rubro || '—' }}</td>
            <td>
              <div class="contacto-cell">
                <span>{{ lead.contacto || '—' }}</span>
                <span v-if="lead.cargo_contacto" class="cargo">{{ lead.cargo_contacto }}</span>
              </div>
            </td>
            <td>
              <span class="estado-badge" :class="lead.estado">{{ estadoLabel(lead.estado) }}</span>
            </td>
            <td class="fecha-cell">{{ formatDate(lead.fecha_contacto) }}</td>
            <td class="actions-cell">
              <button
                v-if="puedeEnviarEmail(lead)"
                @click="iniciarEnvio(lead)"
                class="btn-action btn-enviar"
                title="Enviar email"
              >
                <i class="fa-solid fa-paper-plane"></i>
                <span>Enviar</span>
              </button>

              <div class="estado-actions" v-if="!esEstadoFinal(lead.estado)">
                <button @click="marcarEstado(lead, 'respondio')" class="btn-action btn-estado btn-respondio" title="Marcó como respondió">
                  <i class="fa-solid fa-check"></i>
                </button>
                <button @click="marcarEstado(lead, 'reunion_agendada')" class="btn-action btn-estado btn-reunion" title="Reunión agendada">
                  <i class="fa-solid fa-calendar-check"></i>
                </button>
                <button @click="marcarEstado(lead, 'no_interesado')" class="btn-action btn-estado btn-no-interesado" title="No interesado">
                  <i class="fa-solid fa-ban"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal de preview de email -->
    <EmailPreviewModal
      v-if="emailModal.visible"
      :lead="emailModal.lead"
      :asunto="emailModal.asunto"
      :cuerpo="emailModal.cuerpo"
      :sending="emailModal.sending"
      @close="cerrarModal"
      @confirm="confirmarEnvio"
    />

    <!-- Notificación toast -->
    <Transition name="toast">
      <div v-if="toast.visible" class="toast" :class="toast.type">
        <i :class="toast.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'"></i>
        {{ toast.message }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../firebase/firebaseConfig'
import { collection, getDocs, doc, updateDoc, orderBy, query } from 'firebase/firestore'
import EmailPreviewModal from '../components/EmailPreviewModal.vue'
import {
  puedeEnviarEmail,
  getTemplate,
  debeEnviarHoy,
  enviarEmail,
  ESTADOS_FINALES
} from '../services/emailService.js'

const router = useRouter()
const prospectos = ref([])
const loading = ref(true)
const filtroEstado = ref('')

const emailModal = reactive({
  visible: false,
  lead: null,
  asunto: '',
  cuerpo: '',
  sending: false
})

const toast = reactive({ visible: false, message: '', type: 'success' })

onMounted(async () => {
  try {
    const q = query(collection(db, 'leads'), orderBy('created_at', 'desc'))
    const snapshot = await getDocs(q)
    // Solo documentos de prospección saliente (tienen campo email)
    prospectos.value = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(l => l.email)
  } catch (err) {
    console.error('Error cargando prospectos:', err)
  } finally {
    loading.value = false
  }
})

const prospectosFiltrados = computed(() => {
  if (!filtroEstado.value) return prospectos.value
  return prospectos.value.filter(l => l.estado === filtroEstado.value)
})

const enviarHoy = computed(() =>
  prospectos.value.filter(debeEnviarHoy)
)

const esEstadoFinal = (estado) => ESTADOS_FINALES.includes(estado)

const estadoLabel = (estado) => {
  const map = {
    nuevo: 'Nuevo',
    email_enviado: 'Email enviado',
    seg_3d: 'Seg. día 3',
    seg_5d: 'Seg. día 5',
    seg_14d: 'Seq. día 14',
    respondio: 'Respondió',
    reunion_agendada: 'Reunión agendada',
    no_interesado: 'No interesado'
  }
  return map[estado] || estado
}

const formatDate = (fecha) => {
  if (!fecha) return '—'
  const d = new Date(fecha + 'T12:00:00')
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const iniciarEnvio = (lead) => {
  const template = getTemplate(lead)
  if (!template) return
  emailModal.lead = lead
  emailModal.asunto = template.asunto
  emailModal.cuerpo = template.cuerpo
  emailModal.visible = true
  emailModal.sending = false
}

const cerrarModal = () => {
  if (emailModal.sending) return
  emailModal.visible = false
  emailModal.lead = null
}

const confirmarEnvio = async ({ asunto, cuerpo }) => {
  if (emailModal.sending) return
  emailModal.sending = true
  try {
    const nuevoEstado = await enviarEmail(emailModal.lead, asunto, cuerpo)
    const lead = prospectos.value.find(l => l.id === emailModal.lead.id)
    if (lead) {
      lead.estado = nuevoEstado
      const hoy = new Date().toISOString().split('T')[0]
      lead.fecha_contacto = hoy
      if (emailModal.lead.estado === 'nuevo') lead.fecha_email_inicial = hoy
    }
    emailModal.visible = false
    mostrarToast('Email enviado correctamente', 'success')
  } catch (err) {
    mostrarToast(err.message || 'Error al enviar email', 'error')
  } finally {
    emailModal.sending = false
  }
}

const marcarEstado = async (lead, nuevoEstado) => {
  try {
    const hoy = new Date().toISOString().split('T')[0]
    await updateDoc(doc(db, 'leads', lead.id), {
      estado: nuevoEstado,
      fecha_contacto: hoy
    })
    lead.estado = nuevoEstado
    lead.fecha_contacto = hoy
    mostrarToast(`Estado actualizado: ${estadoLabel(nuevoEstado)}`, 'success')
  } catch (err) {
    mostrarToast('Error al actualizar estado', 'error')
  }
}

const mostrarToast = (message, type = 'success') => {
  toast.message = message
  toast.type = type
  toast.visible = true
  setTimeout(() => { toast.visible = false }, 3500)
}
</script>

<style scoped>
.container { width: 100%; max-width: 1400px; margin: 0 auto; padding: 2rem; }

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.header-left { display: flex; align-items: center; gap: 1rem; }
.header-row h2 {
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
}

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
  white-space: nowrap;
}
.btn-back:hover { color: var(--text-main); border-color: var(--text-muted); }

.filter-select {
  background: var(--bg-surface);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
}

/* Enviar hoy */
.enviar-hoy-section {
  background: rgba(0, 131, 102, 0.06);
  border: 1px solid rgba(0, 131, 102, 0.2);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

.enviar-hoy-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.enviar-hoy-count {
  background: var(--primary);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 20px;
  padding: 0.1rem 0.45rem;
  min-width: 1.2rem;
  text-align: center;
}

.enviar-hoy-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.hoy-chip {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.4rem 0.5rem 0.4rem 0.75rem;
}

.hoy-chip-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hoy-chip-empresa {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
}

.btn-chip-send {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border: none;
  border-radius: 6px;
  background: var(--primary);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: background 0.2s;
}
.btn-chip-send:hover { background: var(--primary-hover); }

/* Loading / Empty */
.loading-state, .empty-state {
  text-align: center;
  padding: 4rem;
  color: var(--text-muted);
  font-size: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.empty-state i { font-size: 2.5rem; opacity: 0.3; }

/* Table */
.table-wrapper {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  overflow-x: auto;
}

.prospects-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.prospects-table thead {
  background: var(--bg-app);
  border-bottom: 1px solid var(--border-color);
}

.prospects-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.th-actions { text-align: center; }

.prospects-table tbody tr {
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
}
.prospects-table tbody tr:last-child { border-bottom: none; }
.prospects-table tbody tr:hover { background: var(--bg-app); }
.prospects-table tbody tr.row-final { opacity: 0.55; }

.prospects-table td {
  padding: 0.75rem 1rem;
  color: var(--text-main);
  vertical-align: middle;
}

.empresa-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.empresa-nombre { font-weight: 600; }
.linkedin-link {
  color: #0077b5;
  font-size: 0.9rem;
  text-decoration: none;
  opacity: 0.7;
  transition: opacity 0.2s;
}
.linkedin-link:hover { opacity: 1; }

.contacto-cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.cargo {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.fecha-cell {
  color: var(--text-muted);
  white-space: nowrap;
}

.actions-cell {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
}

.estado-actions {
  display: flex;
  gap: 0.3rem;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border: none;
  border-radius: 6px;
  font-size: 0.775rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-action:hover { opacity: 0.8; }

.btn-enviar {
  background: rgba(0, 131, 102, 0.12);
  color: var(--primary);
}

.btn-estado {
  padding: 0.35rem 0.5rem;
}

.btn-respondio {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  title: "Respondió";
}
.btn-reunion {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}
.btn-no-interesado {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Estado badges */
.estado-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 20px;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.estado-badge.nuevo { background: rgba(59,130,246,0.12); color: #3b82f6; }
.estado-badge.email_enviado { background: rgba(245,158,11,0.12); color: #d97706; }
.estado-badge.seg_3d { background: rgba(249,115,22,0.12); color: #ea580c; }
.estado-badge.seg_5d { background: rgba(239,68,68,0.12); color: #dc2626; }
.estado-badge.seg_14d { background: rgba(107,114,128,0.12); color: #6b7280; }
.estado-badge.respondio { background: rgba(16,185,129,0.12); color: #059669; }
.estado-badge.reunion_agendada { background: rgba(0,131,102,0.12); color: var(--primary); }
.estado-badge.no_interesado { background: rgba(107,114,128,0.1); color: #9ca3af; }

/* Toast */
.toast {
  position: fixed;
  bottom: 1.75rem;
  right: 1.75rem;
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  box-shadow: var(--shadow);
  z-index: 2000;
}
.toast.success { background: #059669; color: white; }
.toast.error { background: #dc2626; color: white; }

.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(12px); }
</style>
