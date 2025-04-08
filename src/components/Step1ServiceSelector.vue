<template>
    <div>
      <h2>Selecciona un servicio base</h2>
      <div v-for="s in servicios" :key="s.id" @click="selectService(s)">
        <p>{{ s.nombre }} - ${{ s.cobroBase }}</p>
      </div>
      <button :disabled="!selected" @click="$emit('next')">Continuar</button>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { useQuotationStore } from '../store/quotation'
  
  const store = useQuotationStore()
  const selected = ref(null)
  
  const servicios = [
    { id: 1, nombre: 'Landing Page', cobroBase: 250000, cobroAdicional: 25000 },
    { id: 2, nombre: 'Sitio institucional', cobroBase: 450000, cobroAdicional: 50000 },
    { id: 3, nombre: 'Ecommerce', cobroBase: 600000, cobroAdicional: 25000 },
    // agrega más aquí
  ]
  
  const selectService = (s) => {
    selected.value = s
    store.servicio = s
  }
  </script>
  