<template>
  <div class="container">
    <h2>Adicionales para: {{ store.servicio?.nombre }}</h2>

    <div class="extras-grid">
      <div
        v-for="extra in adicionalesDisponibles"
        :key="extra.id"
        class="extra-card"
        :class="{ seleccionado: seleccionados.includes(extra) }"
        @click="toggleExtra(extra)"
      >
        <input
          type="checkbox"
          :value="extra"
          v-model="seleccionados"
          style="display: none;"
        />
        <h4>{{ extra.nombre }}</h4>
        <p>+${{ extra.precio }}</p>
      </div>
    </div>

    <button class="continuar-btn" @click="guardarYContinuar">Continuar</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useQuotationStore } from '../store/quotation'

const emit = defineEmits(['next'])

const store = useQuotationStore()
const seleccionados = ref([...store.adicionales]) // mantener selección si vuelve atrás

const adicionalesDisponibles = [
  { id: 1, nombre: 'Formulario personalizado', precio: 25000 },
  { id: 2, nombre: 'Animaciones especiales', precio: 25000 },
  { id: 3, nombre: 'Integraciones externas', precio: 25000 },
  { id: 4, nombre: 'Multilenguaje', precio: 25000 },
  { id: 5, nombre: 'SEO avanzado', precio: 25000 }
]

const toggleExtra = (extra) => {
  const index = seleccionados.value.findIndex(e => e.id === extra.id)
  if (index === -1) {
    seleccionados.value.push(extra)
  } else {
    seleccionados.value.splice(index, 1)
  }
}

const guardarYContinuar = () => {
  store.adicionales = seleccionados.value
  emit('next')
}
</script>

<style scoped>
.extras-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  margin-top: 1.5rem;
}

.extra-card {
  padding: 1rem;
  border: 2px solid #ccc;
  border-radius: var(--border-radius);
  background-color: #f9f9f9;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.extra-card:hover {
  border-color: var(--primary);
}

.extra-card.seleccionado {
  background-color: #e8f8f3;
  border-color: var(--primary);
}

.continuar-btn {
  margin-top: 2rem;
}
</style>
