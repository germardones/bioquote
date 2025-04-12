<template>
  <div class="container">
    <h2>Datos del Cliente</h2>

    <div class="card">
      <label>Nombre:</label>
      <input v-model="cliente.nombre" type="text" placeholder="Ej: Juan Pérez" />
      <p v-if="errores.nombre" class="error">{{ errores.nombre }}</p>

      <label>Razón Social:</label>
      <input v-model="cliente.razonSocial" type="text" placeholder="Ej: Inversiones JP SpA" />
      <p v-if="errores.razonSocial" class="error">{{ errores.razonSocial }}</p>

      <label>RUT:</label>
      <input v-model="cliente.rut" type="text" placeholder="Ej: 12.345.678-9" />
      <p v-if="errores.rut" class="error">{{ errores.rut }}</p>

      <label>Dirección:</label>
      <input v-model="cliente.direccion" type="text" placeholder="Ej: Av. Libertad 1234" />

      <label>Correo electrónico:</label>
      <input v-model="cliente.email" type="email" placeholder="Ej: cliente@correo.com" />
      <p v-if="errores.email" class="error">{{ errores.email }}</p>

      <label>Contacto (teléfono u otro):</label>
      <input v-model="cliente.contacto" type="text" placeholder="Ej: +56 9 1234 5678" />
      <p v-if="errores.contacto" class="error">{{ errores.contacto }}</p>
    </div>

    <div class="btn-group">
      <button class="continuar-btn" @click="guardarYContinuar">Continuar</button>
      <button @click="volverAtras" class="btn-volver">← Volver atrás</button>
    </div>
  </div>
</template>

<script setup>
import { useQuotationStore } from '../../store/quotation'
import { reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const emit = defineEmits(['next'])
const store = useQuotationStore()

const cliente = reactive({ ...store.cliente })
const errores = reactive({})

const validarRut = (rut) => /^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-[0-9kK]$/.test(rut)
const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const validarTelefono = (telefono) => {
  const soloNumeros = telefono.replace(/\D/g, '')
  return soloNumeros.length >= 9 && soloNumeros.length <= 12
}

const guardarYContinuar = () => {
  errores.nombre = !cliente.nombre ? 'El nombre es obligatorio.' : ''
  errores.razonSocial = !cliente.razonSocial ? 'La razón social es obligatoria.' : ''
  errores.email = !cliente.email
    ? 'El correo electrónico es obligatorio.'
    : !validarEmail(cliente.email)
      ? 'Correo electrónico no válido.'
      : ''
  errores.rut = cliente.rut && !validarRut(cliente.rut)
    ? 'Formato de RUT no válido. Ej: 12.345.678-9'
    : ''
  errores.contacto = cliente.contacto && !validarTelefono(cliente.contacto)
    ? 'Número de contacto no válido (debe tener entre 9 y 12 dígitos).'
    : ''

  const hayErrores = Object.values(errores).some((e) => e)
  if (hayErrores) return

  store.cliente = cliente
  emit('next')
}

const volverAtras = () => {
  router.back()
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
  margin-bottom: 0.5rem;
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

.btn-group {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.continuar-btn,
.btn-volver {
  padding: 12px 20px;
  border-radius: var(--border-radius);
  border: none;
  font-weight: bold;
  cursor: pointer;
  background-color: var(--primary);
  color: white;
}

.continuar-btn:hover,
.btn-volver:hover {
  background-color: #006e53;
}

.error {
  color: red;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}
</style>
