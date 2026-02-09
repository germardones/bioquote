<template>
  <div class="calendar-page fade-in">
    <div class="page-header">
      <button @click="router.back()" class="btn-back">
        <i class="fa-solid fa-arrow-left"></i> Volver
      </button>
      <h2>Agenda de Acciones</h2>
    </div>

    <div class="calendar-wrapper">
      <ActionCalendar />
    </div>
  </div>
</template>

<script setup>
import ActionCalendar from '../../components/dashboard/ActionCalendar.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.calendar-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.page-header h2 {
  margin: 0;
  font-size: 1.8rem;
  color: var(--text-main);
}

.btn-back {
  background: none;
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.btn-back:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--bg-surface);
}

.calendar-wrapper {
  margin-top: 1rem;
}

@media (max-width: 640px) {
  .calendar-page { padding: 1rem; }
  .page-header h2 { font-size: 1.4rem; }
}
</style>
