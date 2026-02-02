<template>
  <div class="cotizacion-wrapper">
    <div class="wizard-container">
      <div class="wizard-header">
        <div
          v-for="(paso, index) in pasos"
          :key="paso.name"
          class="step"
          :class="{
            activo: route.name === paso.name,
            completado: index < pasoActual
          }"
        >
          <div class="circle">{{ index + 1 }}</div>
          <span class="label">{{ paso.label }}</span>
          <div v-if="index < pasos.length - 1" class="line"></div>
        </div>
      </div>
    </div>

    <router-view />
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const pasos = [
  { name: 'Paso1Specs', label: 'Espec. Técnicas' },
  { name: 'Paso2Cliente', label: 'Cliente' },
  { name: 'Paso3Resumen', label: 'Finanzas' }
]

const pasoActual = computed(() => pasos.findIndex(p => p.name === route.name))
</script>

<style scoped>
.wizard-container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
  box-sizing: border-box;
}

.wizard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 1rem;
}

.step {
  display: flex;
  align-items: center;
  min-width: 100px;
  flex-grow: 1;
  justify-content: center;
  text-align: center;
  position: relative;
}

.circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  transition: all 0.3s ease;
  flex-shrink: 0;
  z-index: 2;
}

.label {
  margin-left: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
  transition: color 0.3s;
}

/* Status: Active */
.activo .circle {
  background-color: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 0 10px rgba(0, 131, 102, 0.3);
}

.activo .label {
  color: var(--text-main);
  font-weight: 700;
}

/* Status: Completed */
.completado .circle {
  background-color: rgba(0, 131, 102, 0.1);
  color: var(--primary);
  border-color: var(--primary);
}

.completado .label {
  color: var(--primary);
}
</style>
