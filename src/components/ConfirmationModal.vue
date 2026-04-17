<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3><i class="fa-solid fa-triangle-exclamation"></i> {{ title }}</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      
      <div class="modal-body">
        <p>{{ message }}</p>
        
        <div v-if="verificationText" class="verification-section">
            <p class="instruction">Para confirmar, escriba <strong>{{ verificationText }}</strong> a continuación:</p>
            <input 
                v-model="inputVal" 
                type="text" 
                class="verify-input" 
                :placeholder="verificationText"
                @keyup.enter="handleConfirm"
            />
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" @click="$emit('close')">Cancelar</button>
        <button 
            class="btn-confirm" 
            :disabled="verificationText && inputVal !== verificationText"
            @click="handleConfirm"
        >
            Confirmar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: { type: String, default: 'Confirmación' },
  message: { type: String, required: true },
  verificationText: { type: String, default: '' } // If set, requires exact match
})

const emit = defineEmits(['close', 'confirm'])

const inputVal = ref('')

const handleConfirm = () => {
    if (props.verificationText && inputVal.value !== props.verificationText) return
    emit('confirm')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

.modal-content {
  background: var(--bg-surface);
  padding: 0;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  border: 1px solid var(--border-color);
  animation: slideUp 0.3s;
}

.modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex; justify-content: space-between; align-items: center;
}
.modal-header h3 { margin: 0; color: #dc2626; display: flex; align-items: center; gap: 10px; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); }

.modal-body { padding: 1.5rem; color: var(--text-main); line-height: 1.5; }

.verification-section {
    margin-top: 1.5rem;
    background: var(--bg-app);
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
}
.instruction { margin: 0 0 0.5rem 0; font-size: 0.9rem; }
.verify-input {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 1rem;
    background: var(--input-bg);
    color: var(--text-main);
}

.modal-actions {
    padding: 1rem 1.5rem;
    background: var(--bg-app);
    border-top: 1px solid var(--border-color);
    border-radius: 0 0 12px 12px;
    display: flex; justify-content: flex-end; gap: 1rem;
}

.btn-cancel {
    padding: 10px 20px;
    background: transparent; border: 1px solid var(--border-color);
    border-radius: 6px; cursor: pointer; color: var(--text-main);
}
.btn-confirm {
    padding: 10px 20px;
    background: #dc2626; color: white; border: none;
    border-radius: 6px; cursor: pointer; font-weight: 600;
}
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
