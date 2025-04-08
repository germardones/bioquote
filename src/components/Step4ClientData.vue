<template>
    <div>
      <h2>Datos del Cliente</h2>
      <label>Nombre: <input v-model="cliente.nombre" /></label><br/>
      <label>Contacto: <input v-model="cliente.contacto" /></label><br/>
      <label>Razón Social: <input v-model="cliente.razonSocial" /></label><br/>
      <label>RUT: <input v-model="cliente.rut" /></label><br/>
      <label>Servicio deseado: <input v-model="cliente.servicioDeseado" /></label><br/>
  
      <button @click="guardarYContinuar">Continuar</button>
    </div>
  </template>
  
  <script setup>
  import { useQuotationStore } from '../store/quotation'
  import { reactive } from 'vue'
  
  const store = useQuotationStore()
  
  const cliente = reactive({ ...store.cliente })
  
  const guardarYContinuar = () => {
    store.cliente = cliente
    emit('next')
  }
  </script>
  