<template>
  <div class="container">
    <h2>Editar Cliente</h2>

    <div class="card">
      <label>Nombre:</label>
      <input v-model="cliente.nombre" type="text" />
      <p v-if="errores.nombre" class="error">{{ errores.nombre }}</p>

      <label>Razón Social:</label>
      <input v-model="cliente.razonSocial" type="text" />
      <p v-if="errores.razonSocial" class="error">{{ errores.razonSocial }}</p>

      <label>RUT:</label>
      <input v-model="cliente.rut" type="text" disabled />

      <label>Dirección:</label>
      <input v-model="cliente.direccion" type="text" />

      <label>Correo electrónico:</label>
      <input v-model="cliente.email" type="email" />
      <p v-if="errores.email" class="error">{{ errores.email }}</p>

      <label>Contacto (teléfono u otro):</label>
      <input v-model="cliente.contacto" type="text" />
      <p v-if="errores.contacto" class="error">{{ errores.contacto }}</p>
    </div>

    <div class="btn-group">
      <button class="guardar-btn" @click="guardarCambios" :disabled="loading">
        <span v-if="loading" class="spinner"></span>
        <span v-else>💾 Guardar Cambios</span>
      </button>

      <button class="btn-volver" @click="router.back()" :disabled="loading">
        ← Volver atrás
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase/firebaseConfig'
import { collection, getDocs, updateDoc, query, where } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const rutParam = route.params.rut

const cliente = reactive({
  nombre: '',
  razonSocial: '',
  rut: '',
  direccion: '',
  email: '',
  contacto: ''
})

const errores = reactive({})
const loading = ref(false)

const validarRut = rut => /^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-[0-9kK]$/.test(rut)
const validarEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const validarTelefono = telefono => {
  const soloNumeros = telefono.replace(/\D/g, '')
  return soloNumeros.length >= 9 && soloNumeros.length <= 12
}

onMounted(async () => {
  const cotizaciones = await getDocs(query(collection(db, 'cotizaciones'), where('cliente.rut', '==', rutParam)))
  if (!cotizaciones.empty) {
    const data = cotizaciones.docs[0].data().cliente
    Object.assign(cliente, data)
  } else {
    alert('Cliente no encontrado')
    router.back()
  }
})

const guardarCambios = async () => {
  errores.nombre = !cliente.nombre ? 'El nombre es obligatorio.' : ''
  errores.razonSocial = !cliente.razonSocial ? 'La razón social es obligatoria.' : ''
  errores.email = !cliente.email
    ? 'El correo electrónico es obligatorio.'
    : !validarEmail(cliente.email)
    ? 'Correo electrónico no válido.'
    : ''
  errores.contacto = cliente.contacto && !validarTelefono(cliente.contacto)
    ? 'Número de contacto no válido (9 a 12 dígitos).'
    : ''

  const hayErrores = Object.values(errores).some(Boolean)
  if (hayErrores) return

  loading.value = true

  const q = query(collection(db, 'cotizaciones'), where('cliente.rut', '==', rutParam))
  const snapshot = await getDocs(q)

  const updates = snapshot.docs.map(docRef =>
    updateDoc(docRef.ref, { cliente: { ...cliente } })
  )

  await Promise.all(updates)

  setTimeout(() => {
    loading.value = false
    router.push('/dashboard')
  }, 1000)
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
.error {
  color: red;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}
.btn-group {
  margin-top: 1.5rem;
  display: flex;
  gap: 1rem;
}
.guardar-btn {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
.guardar-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.spinner {
  width: 18px;
  height: 18px;
  border: 3px solid white;
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.btn-volver {
  background-color: #ccc;
  color: #000;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}
.btn-volver:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
