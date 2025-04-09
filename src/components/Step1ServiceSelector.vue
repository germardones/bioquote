<template>
  <div class="container">
    <h2>Selecciona un servicio base</h2>

    <div class="flex">
      <div
        class="card servicio-opcion"
        v-for="s in servicios"
        :key="s.id"
        :class="{ activo: selected?.id === s.id }"
        @click="selectService(s)"
      >
        <strong>{{ s.nombre }}</strong>
        <p>${{ s.cobroBase }}</p>
      </div>
    </div>

    <button :disabled="!selected" @click="$emit('next')">Continuar</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useQuotationStore } from '../store/quotation'

const store = useQuotationStore()
const selected = ref(store.servicio)

const servicios = [
  { id: 1, nombre: 'Landing Page', cobroBase: 250000, cobroAdicional: 25000 },
  { id: 2, nombre: 'Sitio institucional', cobroBase: 450000, cobroAdicional: 50000 },
  { id: 3, nombre: 'Ecommerce', cobroBase: 600000, cobroAdicional: 25000 }
]

const selectService = (s) => {
  selected.value = s
  store.servicio = s
}
</script>

<style scoped>
.servicio-opcion {
  cursor: pointer;
  flex: 1 1 calc(33% - 1rem);
  text-align: center;
  transition: transform 0.2s ease;
}

.servicio-opcion:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.servicio-opcion.activo {
  border: 2px solid var(--primary);
  background-color: #e8f8f3;
}
</style>
