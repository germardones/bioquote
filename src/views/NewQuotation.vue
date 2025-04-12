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
  { name: 'Paso1Servicios', label: 'Servicios' },
  { name: 'Paso2Adicionales', label: 'Adicionales' },
  { name: 'Paso3Horas', label: 'Horas' },
  { name: 'Paso4Cliente', label: 'Cliente' },
  { name: 'Paso5Resumen', label: 'Resumen' }
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
}

.step {
  display: flex;
  align-items: center;
  min-width: 100px;
  flex-grow: 1;
  justify-content: center;
  text-align: center;
}

.circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #ccc;
  background-color: white;
  color: #555;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  transition: background-color 0.3s, color 0.3s, border-color 0.3s;
  flex-shrink: 0;
}

.label {
  margin-left: 0.5rem;
  font-weight: 500;
  color: #555;
  white-space: nowrap;
}

/* Paso activo */
.activo .circle {
  background-color: var(--primary, #008366);
  color: white;
  border-color: var(--primary, #008366);
}

/* Pasos completados */
.completado .circle {
  background-color: #e6fff5;
  color: var(--primary, #008366);
  border-color: var(--primary, #008366);
}

</style>
