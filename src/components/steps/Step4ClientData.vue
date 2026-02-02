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
      <div class="rut-input-group">
        <input 
          v-model="cliente.rut" 
          type="text" 
          placeholder="Ej: 12.345.678-9" 
          @blur="buscarCliente"
        />
        <span v-if="buscandoCliente" class="loading-icon">🔍</span>
      </div>
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
      <button class="btn-continuar" @click="guardarYContinuar">Continuar</button>
      <button @click="volverAtras" class="btn-volver">
        <span class="icon">⬅️</span> Volver
      </button>
    </div>
  </div>
</template>

<script setup>
import { useQuotationStore } from '../../store/quotation'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../../firebase/firebaseConfig'
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore'

const router = useRouter()
const store = useQuotationStore()

const cliente = reactive({ ...store.cliente })
const errores = reactive({})
const buscandoCliente = ref(false)

// Validaciones
const validarRut = (rut) => /^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-[0-9kK]$/.test(rut)
const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const validarTelefono = (telefono) => {
  const soloNumeros = telefono.replace(/\D/g, '')
  return soloNumeros.length >= 9 && soloNumeros.length <= 12
}

const buscarCliente = async () => {
  if (!cliente.rut || !validarRut(cliente.rut)) return

  buscandoCliente.value = true
  try {
    /*
       Para evitar un índice compuesto, traemos los últimos 10 proyectos de este RUT
       y ordenamos en memoria para obtener el más reciente.
    */
    const qSimple = query(
         collection(db, 'projects'),
         where('client_data.rut', '==', cliente.rut),
         limit(10) 
    )
      
    const snapshot = await getDocs(qSimple)
      
    if (!snapshot.empty) {
      // Ordenar en memoria descendente por fecha
      const docs = snapshot.docs.map(d => d.data())
      
      // Asumimos que created_at es timestamp. Si no existe, lo tratamos como antiguo.
      docs.sort((a, b) => {
          const tA = a.created_at?.seconds || 0
          const tB = b.created_at?.seconds || 0
          return tB - tA
      })

      const mostRecent = docs[0]
      const c = mostRecent.client_data || mostRecent.cliente 
      
      if (c) {
        cliente.nombre = c.nombre || mostRecent.client_name || ''
        cliente.razonSocial = c.razonSocial || ''
        cliente.direccion = c.direccion || ''
        cliente.email = c.email || ''
        cliente.contacto = c.contacto || ''
      }
    }
  } catch (error) {
    console.error('Error buscando cliente:', error)
  } finally {
    buscandoCliente.value = false
  }
}

const guardarYContinuar = () => {
  errores.nombre = !cliente.nombre ? 'El nombre es obligatorio.' : ''
  errores.razonSocial = !cliente.razonSocial ? 'La razón social es obligatoria.' : ''
  errores.rut = cliente.rut && !validarRut(cliente.rut)
    ? 'Formato de RUT no válido. Ej: 12.345.678-9'
    : ''
  errores.email = !cliente.email
    ? 'El correo electrónico es obligatorio.'
    : !validarEmail(cliente.email)
      ? 'Correo electrónico no válido.'
      : ''
  errores.contacto = cliente.contacto && !validarTelefono(cliente.contacto)
    ? 'Número de contacto no válido (debe tener entre 9 y 12 dígitos).'
    : ''

  const hayErrores = Object.values(errores).some(Boolean)
  if (hayErrores) return

  store.cliente = cliente
  router.push({ name: 'Paso3Resumen' })
}

const volverAtras = () => {
  router.push({ name: 'Paso1Specs' })
}
</script>

<style scoped>
.card {
  background: var(--bg-surface);
  padding: 2rem;
  margin-top: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow);
}

input {
  padding: 12px;
  margin-bottom: 0.5rem;
  width: 100%;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-main);
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(0, 131, 102, 0.2);
}

label {
  font-weight: 600;
  margin-top: 1.25rem;
  display: block;
  color: var(--text-main);
}

.btn-group {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.btn-continuar {
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-weight: 700;
  cursor: pointer;
  background-color: var(--primary);
  color: white;
  transition: all 0.2s;
  flex: 1;
}

.btn-continuar:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
}

.error {
  color: #ef4444;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.rut-input-group {
  position: relative;
}

.loading-icon {
  position: absolute;
  right: 12px;
  top: 14px;
  color: var(--primary);
  animation: spin 1s infinite linear;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
