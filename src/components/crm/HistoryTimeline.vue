<template>
  <div class="history-timeline">
    <h3>Bitácora de Interacciones</h3>
    
    <!-- Formulario Nueva Interacción -->
    <div class="new-interaction">
      <div class="form-row">
        <select v-model="newLog.type" class="type-select">
          <option value="call">📞 Llamada</option>
          <option value="email">📧 Correo</option>
          <option value="meeting">🤝 Reunión</option>
          <option value="note">📝 Nota</option>
          <option value="whatsapp">📱 WhatsApp</option>
        </select>
        <input 
          v-model="newLog.summary" 
          type="text" 
          placeholder="Resumen corto..." 
          class="summary-input"
        />
        <input 
          v-model="newLog.date" 
          type="datetime-local" 
          class="date-input"
        />
        <button @click="addLog" :disabled="!isValid" class="btn-add">
          <i class="fa-solid fa-plus"></i> Agregar
        </button>
      </div>
      <textarea 
        v-model="newLog.details" 
        placeholder="Detalles adicionales..."
        class="details-input"
        rows="2"
      ></textarea>
    </div>

    <!-- Timeline -->
    <div class="timeline-container">
      <div v-if="loading" class="loading">Cargando historial...</div>
      <div v-else-if="logs.length === 0" class="empty-state">
        No hay interacciones registradas.
      </div>
      
      <div v-else class="timeline">
        <div v-for="log in logs" :key="log.id" class="timeline-item" :class="log.type">
          <div class="timeline-marker">
            <i :class="getIcon(log.type)"></i>
          </div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="log-type">{{ getLabel(log.type) }}</span>
              <span class="log-date">{{ formatDate(log.date) }}</span>
            </div>
            <h4 class="log-summary">{{ log.summary }}</h4>
             <p v-if="log.details" class="log-details">{{ log.details }}</p>
             <div class="log-meta" v-if="log.author">
                <small>Por: {{ log.author }}</small>
             </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, auth } from '../../firebase/firebaseConfig'
import { collection, addDoc, query, where, getDocs, orderBy, Timestamp, updateDoc, doc } from 'firebase/firestore'

const props = defineProps({
  clientRut: {
    type: String,
    required: true
  }
})

const logs = ref([])
const loading = ref(true)

const newLog = ref({
  type: 'call',
  summary: '',
  details: '',
  date: new Date().toISOString().slice(0, 16)
})

const isValid = computed(() => {
  return newLog.value.summary.trim().length > 0 && newLog.value.date
})

const getIcon = (type) => {
  const map = {
    call: 'fa-solid fa-phone',
    email: 'fa-solid fa-envelope',
    meeting: 'fa-solid fa-handshake',
    note: 'fa-solid fa-sticky-note',
    whatsapp: 'fa-brands fa-whatsapp'
  }
  return map[type] || 'fa-solid fa-circle'
}

const getLabel = (type) => {
    const map = {
    call: 'Llamada',
    email: 'Correo',
    meeting: 'Reunión',
    note: 'Nota',
    whatsapp: 'WhatsApp'
  }
  return map[type] || type
}

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  // Handle Firestore Timestamp or Date string
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date)
}

const fetchLogs = async () => {
  if (!props.clientRut) return
  
  loading.value = true
  try {
    // Note: Removed orderBy to avoid needing a composite index (clientRut + date)
    // We will sort client-side instead.
    const q = query(
      collection(db, 'crm_interactions'), 
      where('clientRut', '==', props.clientRut)
    )
    const snapshot = await getDocs(q)
    
    const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Sort descending by date (Timestamp)
    logs.value = fetchedLogs.sort((a, b) => {
        const dateA = a.date && a.date.seconds ? a.date.seconds : 0
        const dateB = b.date && b.date.seconds ? b.date.seconds : 0
        return dateB - dateA
    })
  } catch (e) {
    console.error("Error fetching logs:", e)
  } finally {
    loading.value = false
  }
}

const addLog = async () => {
    if (!isValid.value) return

    try {
        const user = auth.currentUser
        const logData = {
            clientRut: props.clientRut,
            type: newLog.value.type,
            summary: newLog.value.summary,
            details: newLog.value.details,
            date: Timestamp.fromDate(new Date(newLog.value.date)),
            createdAt: Timestamp.now(),
            author: user ? (user.displayName || user.email) : 'Sistema',
            authorUid: user ? user.uid : null
        }

        const docRef = await addDoc(collection(db, 'crm_interactions'), logData)
        
        // Add locally for instant feedback
        logs.value.unshift({ id: docRef.id, ...logData })

        // Update Project(s) last_interaction_date
        // We find all projects for this client and update the date to refresh the "Matrix"
        const qProj = query(collection(db, 'projects'), where('client_data.rut', '==', props.clientRut))
        const snapProj = await getDocs(qProj)
        
        // Also check legacy if needed, but we encourage migration. 
        // For now, let's just update perfectly matched new structure docs.
        const updatePromises = snapProj.docs.map(d => updateDoc(d.ref, {
             'client_data.last_interaction_date': new Date().toISOString()
        }))
        await Promise.all(updatePromises)
        
        // Reset form
        newLog.value.summary = ''
        newLog.value.details = ''
        newLog.value.type = 'call'
    } catch (e) {
        console.error("Error adding log:", e)
        alert("Error al guardar la interacción")
    }
}

onMounted(() => {
    fetchLogs()
})
</script>

<style scoped>
.history-timeline {
    padding: 1rem 0;
}

/* Form Styles */
.new-interaction {
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    padding: 1.25rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 10px;
}

.type-select, .date-input, .summary-input {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--input-bg);
    color: var(--text-main);
}

.summary-input { 
    /* Removed specific flex/min-width as grid handles it */
    border: 1px solid rgba(255,255,255,0.2); 
}

.btn-add {
    width: 100%; /* Full width of grid cell */
    height: 100%; /* Match height of input */
    padding: 10px; /* Match padding */
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: opacity 0.2s;
    display: flex; justify-content: center; align-items: center; gap: 8px;
}
.btn-add:disabled { opacity: 0.5; cursor: not-allowed; }

.details-input {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--input-bg);
    color: var(--text-main);
    resize: vertical;
}

/* Timeline Styles */
.timeline {
    position: relative;
    padding-left: 2rem;
    border-left: 2px solid var(--border-color);
}

.timeline-item {
    position: relative;
    margin-bottom: 2rem;
}

.timeline-marker {
    position: absolute;
    left: -2.65rem;
    top: 0;
    width: 2.5rem; /* Ajustado para alinear correctamente al centro de la línea */
    height: 2.5rem;
    display: flex; /* Flexbox para centrar visualmente el icono */
    align-items: center; /* Centrado vertical */
    justify-content: center; /* Centrado horizontal */
    border-radius: 50%;
    border: 3px solid var(--bg-app); /* Borde externo para separar del timeline */
    background: var(--bg-surface);
    color: var(--text-muted);
    z-index: 1;
}

.timeline-marker i {
    font-size: 1rem; /* Ajuste tamaño fuente */
}


/* Type Colors */
.call .timeline-marker { background: #e0f2fe; color: #0284c7; }
.email .timeline-marker { background: #f0fdf4; color: #16a34a; }
.meeting .timeline-marker { background: #fefce8; color: #ca8a04; }
.note .timeline-marker { background: #f3f4f6; color: #4b5563; }
.whatsapp .timeline-marker { background: #dcfce7; color: #25d366; }

.timeline-content {
    background: var(--bg-surface);
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
}

.timeline-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}

.log-type {
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--text-muted);
    letter-spacing: 0.5px;
}

.log-date {
    font-size: 0.85rem;
    color: var(--text-muted);
}

.log-summary {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: var(--text-main);
}

.log-details {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-muted);
    white-space: pre-wrap;
}

.log-meta {
    margin-top: 0.8rem;
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: right;
}

@media (max-width: 640px) {
    .form-row { grid-template-columns: 1fr; }
    .timeline { padding-left: 1.5rem; }
    .timeline-marker { 
        width: 32px; height: 32px; left: -2.1rem; 
        font-size: 0.9rem; /* Slightly smaller icon on mobile */
    } 
}
</style>
