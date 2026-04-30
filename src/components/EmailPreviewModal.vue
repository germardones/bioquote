<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h3><i class="fa-solid fa-envelope-open-text"></i> Vista previa del email</h3>
        <button class="btn-close" @click="$emit('close')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="field-group">
          <label>Destinatario</label>
          <div class="field-readonly">
            <i class="fa-solid fa-user fa-xs"></i>
            {{ lead.contacto }} &lt;{{ lead.email }}&gt;
          </div>
        </div>

        <div class="field-group">
          <label>Asunto</label>
          <input v-model="asuntoLocal" class="field-input" type="text" />
        </div>

        <div class="field-group">
          <label>Cuerpo del email</label>
          <textarea v-model="cuerpoLocal" class="field-textarea" rows="16"></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('close')" class="btn-secondary" :disabled="sending">
          Cancelar
        </button>
        <button @click="confirmar" class="btn-primary" :disabled="sending">
          <i class="fa-solid fa-paper-plane"></i>
          {{ sending ? 'Enviando...' : 'Enviar email' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  lead: { type: Object, required: true },
  asunto: { type: String, required: true },
  cuerpo: { type: String, required: true },
  sending: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'confirm'])

const asuntoLocal = ref(props.asunto)
const cuerpoLocal = ref(props.cuerpo)

watch(() => props.asunto, v => { asuntoLocal.value = v })
watch(() => props.cuerpo, v => { cuerpoLocal.value = v })

const confirmar = () => {
  emit('confirm', { asunto: asuntoLocal.value, cuerpo: cuerpoLocal.value })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: var(--bg-surface);
  border-radius: 14px;
  width: 100%;
  max-width: 700px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 1.05rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--primary);
}

.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 1.1rem;
  padding: 0.25rem 0.4rem;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;
}
.btn-close:hover { color: var(--text-main); background: var(--border-color); }

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  flex: 1;
}

.field-group { display: flex; flex-direction: column; gap: 0.4rem; }

.field-group label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.field-readonly {
  font-size: 0.875rem;
  color: var(--text-muted);
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.field-input,
.field-textarea {
  font-size: 0.875rem;
  background: var(--bg-app);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-family: inherit;
  line-height: 1.6;
  transition: border-color 0.2s;
  resize: vertical;
}
.field-input:focus,
.field-textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

.btn-secondary {
  padding: 0.55rem 1.25rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: color 0.2s, border-color 0.2s;
}
.btn-secondary:hover:not(:disabled) { color: var(--text-main); border-color: var(--text-muted); }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  padding: 0.55rem 1.4rem;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s, opacity 0.2s;
}
.btn-primary:hover:not(:disabled) { background: var(--primary-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
