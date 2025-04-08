<template>
    <div>
      <h2>¿Requiere horas de personalización adicional?</h2>
      <label>
        Horas adicionales:
        <input type="number" v-model.number="horas" min="0" />
      </label>
      <p>Total por horas extra: ${{ horas * (store.servicio?.cobroAdicional || 0) }}</p>
      <button @click="guardarYContinuar">Continuar</button>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { useQuotationStore } from '../store/quotation'
  
  const store = useQuotationStore()
  const horas = ref(store.horasExtra)
  
  const guardarYContinuar = () => {
    store.horasExtra = horas.value
    emit('next')
  }
  </script>
  