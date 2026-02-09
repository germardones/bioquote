<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ isEditing ? 'Editar Cliente' : 'Nuevo Cliente' }}</h2>
        <button class="btn-close" @click="$emit('close')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>Nombre Fantasía *</label>
            <input v-model="form.nombre" type="text" required placeholder="Ej: Tech Solutions" />
          </div>

          <div class="form-group">
            <label>RUT</label>
            <input v-model="form.rut" type="text" placeholder="12.345.678-9" @input="handleRutInput" maxlength="12" />
          </div>

          <div class="form-group">
            <label>Razón Social</label>
            <input v-model="form.razonSocial" type="text" placeholder="Ej: Tech Solutions SpA" />
          </div>

          <div class="form-row">
            <div class="form-group">
                <label>Email Contacto</label>
                <input v-model="form.email" type="email" placeholder="contacto@empresa.cl" />
            </div>
            <div class="form-group">
                <label>Teléfono</label>
                <input v-model="form.telefono" type="tel" placeholder="+569..." />
            </div>
          </div>

          <div class="form-group">
            <label>Dirección</label>
            <input v-model="form.direccion" type="text" placeholder="Av. Siempre Viva 123" />
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancel" @click="$emit('close')">Cancelar</button>
            <button type="submit" class="btn-save" :disabled="loading">
              <span v-if="loading"><i class="fa-solid fa-spinner fa-spin"></i> Guardando...</span>
              <span v-else>Guardar Cliente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { formatRut } from '../utils/rutUtils'

const props = defineProps({
  client: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'save'])

const isEditing = ref(false)
const form = reactive({
  nombre: '',
  rut: '',
  razonSocial: '',
  email: '',
  telefono: '',
  direccion: ''
})

watch(() => props.client, (newVal) => {
  if (newVal) {
    isEditing.value = true
    Object.assign(form, newVal)
    // Ensure existing RUT is formatted when opening edit
    if(form.rut) form.rut = formatRut(form.rut) 
  } else {
    isEditing.value = false
    // Reset form
    form.nombre = ''
    form.rut = ''
    form.razonSocial = ''
    form.email = ''
    form.telefono = ''
    form.direccion = ''
  }
}, { immediate: true })

const handleRutInput = (e) => {
    form.rut = formatRut(e.target.value)
}

const handleSubmit = () => {
    // If no RUT is provided, we might need a strategy. 
    // For now, if preserving old logic:
    // We emitted 'save' and the parent handled it.
    // Parent handles `setDoc(doc(db, 'clients', clientData.rut))` which fails if no rut.
    // We should probably check if parent can handle it or enforce minimal identifier.
    // User asked "no mandatory fields", but we need a primary key.
    // Let's rely on Name if no RUT? Or generate a random ID?
    // Given the previous code in ClientesView uses RUT as ID, we need to adjust parent or ensure RUT is generated/optional.
    
    // Actually, let's keep it simple: Pass data. Parent ClientesView logic needs update if RUT is missing.
    emit('save', { ...form })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: var(--bg-surface);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  border: 1px solid var(--border-color);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-muted);
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
    display: flex;
    gap: 1rem;
}
.form-row .form-group { flex: 1; }

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.form-group input {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--input-bg);
  color: var(--text-main);
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-cancel {
  background: none;
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-main);
}

.btn-save {
  background: var(--primary);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.btn-save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
