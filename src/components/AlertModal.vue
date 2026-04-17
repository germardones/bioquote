<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3><i class="fa-solid fa-circle-info"></i> {{ title }}</h3>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      
      <div class="modal-body">
        <p>{{ message }}</p>
      </div>

      <div class="modal-actions">
        <button class="btn-confirm" @click="close">Aceptar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps(['title', 'message', 'visible'])
const emit = defineEmits(['close'])

const close = () => {
    emit('close')
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
  z-index: 2000;
  animation: fadeIn 0.2s;
}

.modal-content {
  background: var(--bg-surface);
  padding: 0;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  border: 1px solid var(--border-color);
  animation: slideUp 0.3s;
}

.modal-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex; justify-content: space-between; align-items: center;
}
.modal-header h3 { margin: 0; color: var(--primary); display: flex; align-items: center; gap: 10px; font-size: 1.1rem; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); }

.modal-body { padding: 1.5rem; color: var(--text-main); line-height: 1.5; text-align: center; }

.modal-actions {
    padding: 1rem 1.5rem;
    background: var(--bg-app);
    border-top: 1px solid var(--border-color);
    border-radius: 0 0 12px 12px;
    display: flex; justify-content: center;
}

.btn-confirm {
    padding: 10px 30px;
    background: var(--primary); color: white; border: none;
    border-radius: 6px; cursor: pointer; font-weight: 600;
}
.btn-confirm:hover { background: var(--primary-hover); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
