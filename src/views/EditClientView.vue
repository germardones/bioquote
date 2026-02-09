<template>
  <div class="edit-client-page">
    <h2>Editar Cliente</h2>

    <div class="card grid-form">
      <div class="field">
        <label>Nombre:</label>
        <input v-model="cliente.nombre" type="text" />
        <p v-if="errores.nombre" class="error">{{ errores.nombre }}</p>
      </div>

      <div class="field">
        <label>Razón Social:</label>
        <input v-model="cliente.razonSocial" type="text" />
        <p v-if="errores.razonSocial" class="error">{{ errores.razonSocial }}</p>
      </div>

      <div class="field">
        <label>RUT:</label>
        <input v-model="cliente.rut" type="text" disabled />
      </div>

      <div class="field">
        <label>Correo electrónico:</label>
        <input v-model="cliente.email" type="email" />
        <p v-if="errores.email" class="error">{{ errores.email }}</p>
      </div>

      <div class="field full-width">
        <label>Dirección:</label>
        <input v-model="cliente.direccion" type="text" />
      </div>

      <div class="field">
        <label>Contacto (teléfono u otro):</label>
        <input v-model="cliente.contacto" type="text" />
        <p v-if="errores.contacto" class="error">{{ errores.contacto }}</p>
      </div>
    </div>

    <div class="btn-group">
      <button class="guardar-btn" @click="guardarCambios" :disabled="loading">
        <span v-if="loading" class="spinner"></span>
        <span v-else>💾 Guardar Cambios</span>
      </button>

       <button @click="router.push('/dashboard')" class="btn-volver">
         Volver
       </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../firebase/firebaseConfig'
import { collection, getDocs, updateDoc, query, where, limit } from 'firebase/firestore'
import { formatRut } from '../utils/rutUtils'

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
  try {
    // Buscar en projects por client_data.rut
    // Ojo: Si tenemos índice, usamos client_data.rut. Si no, client_name fallback?
    // Asumiremos que rutParam es el RUT.
    
    // Primero intentamos buscar exact match por rut en client_data
    const qRut = query(collection(db, 'projects'), where('client_data.rut', '==', rutParam), limit(1))
    let snapshot = await getDocs(qRut)
    
    if (snapshot.empty) {
        // Fallback: buscar por client_name si rutParam parece nombre o si no encontramos por rut
        // Pero el param se llama rut... asumamos que es rut.
        
        // Intento buscar en legacy 'cliente.rut' por si acaso
        const qLegacy = query(collection(db, 'projects'), where('cliente.rut', '==', rutParam), limit(1))
        snapshot = await getDocs(qLegacy)
    }

    if (!snapshot.empty) {
      const docData = snapshot.docs[0].data()
      const data = docData.client_data || docData.cliente
      if (data) {
          Object.assign(cliente, data)
          // Format RUT for display
          if(cliente.rut) cliente.rut = formatRut(cliente.rut)
      }
    } else {
      console.warn('Cliente no encontrado con RUT:', rutParam)
      // No redirigimos inmediatamente para permitir debug o reintento manual si fuera necesario
      // router.back() 
    }
  } catch(e) {
    console.error(e)
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

  try {
      // Actualizar TODOS los proyectos de este cliente
      // Nota: Esto es costoso si hay muchos. Idealmente normalize clients collection.
      
      const q = query(collection(db, 'projects'), where('client_data.rut', '==', rutParam))
      const snapshot = await getDocs(q)
    
      const updates = snapshot.docs.map(docRef =>
        updateDoc(docRef.ref, { 
            client_data: { ...cliente },
            client_name: cliente.nombre // Mantener sync
        })
      )
    
      await Promise.all(updates)
    
      setTimeout(() => {
        loading.value = false
        router.push('/admin') // Volver a Admin Dashboard o Clientes
      }, 1000)
  } catch (e) {
      console.error(e)
      loading.value = false
      alert('Error al guardar cambios')
  }
}
</script>

<style scoped>
.edit-client-page {
  max-width: 1200px !important;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
}

h2 {
    margin-bottom: 2rem;
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--text-main);
}

.card {
  background: var(--bg-surface);
  padding: 2.5rem;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow);
  width: 100% !important;
}

.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.2rem;
}

label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-main);
  font-size: 0.95rem;
}

input {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--input-bg);
  color: var(--text-main);
  font-size: 1rem;
  transition: all 0.2s ease;
  width: 100%;
}

input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(0, 131, 102, 0.1);
}

input:disabled {
  opacity: 0.6;
  background: var(--bg-app);
  cursor: not-allowed;
}

.error {
  color: #ef4444;
  font-size: 0.85rem;
  margin-top: 0.4rem;
  font-weight: 500;
}

.btn-group {
  margin-top: 2.5rem;
  display: flex;
  gap: 1rem;
}

.guardar-btn {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 2;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.guardar-btn:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 131, 102, 0.2);
}

.guardar-btn:disabled {
  opacity: 0.5;
}

.btn-volver {
    flex: 1;
    padding: 14px 28px;
    font-weight: 700;
    border-radius: 10px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .edit-client-page { padding: 1rem; }
  .card { padding: 1.5rem; }
  h2 { font-size: 1.5rem; margin-bottom: 1.5rem; }
  .btn-group { flex-direction: column; gap: 1rem; }
  .guardar-btn { width: 100%; order: -1; }
  .btn-volver { width: 100%; }
}
</style>
