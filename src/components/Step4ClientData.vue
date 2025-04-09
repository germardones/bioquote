<template>
  <div class="container">
    <h2>Datos del Cliente</h2>

    <div class="card">
      <label>Nombre:</label>
      <input v-model="cliente.nombre" type="text" placeholder="Ej: Juan Pérez" />

      <label>Contacto:</label>
      <input v-model="cliente.contacto" type="text" placeholder="Correo o teléfono" />

      <label>Razón Social:</label>
      <input v-model="cliente.razonSocial" type="text" placeholder="Ej: Inversiones JP SpA" />

      <label>RUT:</label>
      <input v-model="cliente.rut" type="text" placeholder="Ej: 12.345.678-9" />

      <label>Servicio deseado:</label>
      <input v-model="cliente.servicioDeseado" type="text" placeholder="Ej: Ecommerce, PWA, etc." />
    </div>

    <button class="continuar-btn" @click="guardarYContinuar">Continuar</button>
  </div>
</template>

<script setup>
import { useQuotationStore } from '../store/quotation'
import { reactive } from 'vue'

const emit = defineEmits(['next'])
const store = useQuotationStore()

const cliente = reactive({ ...store.cliente })

const guardarYContinuar = () => {
  store.cliente = cliente
  emit('next')
}
</script>

<style scoped>
.card {
  background: #f9f9f9;
  padding: 1.5rem;
  margin-top: 1.5rem;
  border: 1px solid #ddd;
  border-radius: var(--border-radius);
}

input {
  padding: 10px;
  margin-bottom: 1rem;
  width: 100%;
  box-sizing: border-box;
  border-radius: var(--border-radius);
  border: 1px solid #ccc;
}

label {
  font-weight: bold;
  margin-top: 1rem;
  display: block;
}
</style>
