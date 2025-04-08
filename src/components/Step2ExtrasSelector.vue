<template>
    <div>
      <h2>Adicionales para: {{ store.servicio?.nombre }}</h2>
      <div v-for="extra in adicionalesDisponibles" :key="extra.id">
        <label>
          <input type="checkbox" :value="extra" v-model="seleccionados" />
          {{ extra.nombre }} (+${{ extra.precio }})
        </label>
      </div>
      <button @click="guardarYContinuar">Continuar</button>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { useQuotationStore } from '../store/quotation'
  
  const store = useQuotationStore()
  const seleccionados = ref([])
  
  const adicionalesDisponibles = [
    { id: 1, nombre: 'Formulario personalizado', precio: 25000 },
    { id: 2, nombre: 'Animaciones especiales', precio: 25000 },
    { id: 3, nombre: 'Integraciones externas', precio: 25000 },
    { id: 4, nombre: 'Multilenguaje', precio: 25000 },
    { id: 5, nombre: 'SEO avanzado', precio: 25000 },
    // puedes condicionar según el servicio seleccionado también
  ]
  
  const guardarYContinuar = () => {
    store.adicionales = seleccionados.value
    // avanzar al siguiente paso
    emit('next')
  }
  </script>
  