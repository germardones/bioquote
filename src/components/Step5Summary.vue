<template>
  <div class="container">
    <div class="header">
      <h2>Resumen de Cotización</h2>
      <span v-if="store.codigo" class="codigo-cotizacion">Código: {{ store.codigo }}</span>
    </div>

    <div v-if="store.servicio && store.cliente && store.total !== null" class="card resumen">
      <h3>Cliente</h3>
      <p>{{ store.cliente.nombre }} | {{ store.cliente.razonSocial }} | {{ store.cliente.rut }}</p>

      <hr />

      <h3>Servicio Base</h3>
      <p>{{ store.servicio.nombre }} - ${{ store.servicio.cobroBase }}</p>

      <hr />

      <h3>Adicionales</h3>
      <ul v-if="store.adicionales.length > 0">
        <li v-for="a in store.adicionales" :key="a.id">
          {{ a.nombre }} - ${{ a.precio }}
        </li>
      </ul>
      <p v-else>(Sin adicionales)</p>

      <hr />

      <h3>Horas Extra</h3>
      <p>
        {{ store.horasExtra }} hora(s) - $
        {{ store.horasExtra * (store.servicio?.cobroAdicional || 0) }}
      </p>

      <hr />

      <h3>Total Final</h3>
      <p class="total">${{ store.total }}</p>
    </div>

    <p v-else>Cargando datos de cotización...</p>

    <!-- Botones -->
    <div class="btn-group">
      <button class="guardar-btn" @click="guardarCotizacion" :disabled="cargando">
        💾 Guardar Cotización
      </button>

      <button @click="router.push('/imprimir')" :disabled="cargando">
        🖨️ Imprimir Cotización
      </button>

      <button class="volver-btn" @click="volverADashboard" :disabled="cargando">
        🔙 Volver al Dashboard
      </button>
    </div>

    <!-- Overlay de carga -->
    <div v-if="cargando" class="overlay-carga">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { useQuotationStore } from '../store/quotation'
import { useRouter } from 'vue-router'
import { db, auth } from '../firebase/firebaseConfig'
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore'
import { ref } from 'vue'

const store = useQuotationStore()
const router = useRouter()
const cargando = ref(false)

const empresa = {
  nombre: 'BioBio Code',
  rut: '76.123.456-7',
  direccion: 'Barros Arana 492, Of. 78, Concepción, Chile',
  telefono: '+56 9 3104 7688',
  email: 'contacto@biobiocode.cl'
}

const guardarCotizacion = async () => {
  try {
    const user = auth.currentUser
    if (!user) return alert('Usuario no autenticado.')

    cargando.value = true

    const contadorRef = doc(db, 'contador', 'cotizaciones')
    const contadorSnap = await getDoc(contadorRef)

    let ultimoCorrelativo = 0
    if (contadorSnap.exists()) {
      ultimoCorrelativo = contadorSnap.data().ultimoCorrelativo || 0
    }

    const nuevoCorrelativo = ultimoCorrelativo + 1
    const codigoCotizacion = `COT-${String(nuevoCorrelativo).padStart(3, '0')}`

    const cotizacion = {
      codigo: codigoCotizacion,
      vendedorUID: user.uid,
      vendedorNombre: user.displayName || 'Sin nombre',
      vendedorEmail: user.email,
      cliente: store.cliente,
      servicioBase: store.servicio,
      adicionales: store.adicionales,
      horasExtra: store.horasExtra,
      total: store.total,
      createdAt: serverTimestamp(),
      empresa: empresa
    }

    await addDoc(collection(db, 'cotizaciones'), cotizacion)
    await setDoc(contadorRef, { ultimoCorrelativo: nuevoCorrelativo })

    store.codigo = codigoCotizacion
    store.vendedorNombre = user.displayName
    store.vendedorEmail = user.email
    store.empresa = empresa

  } catch (err) {
    console.error('Error al guardar cotización', err)
  } finally {
    cargando.value = false
  }
}

const volverADashboard = () => {
  if (confirm('¿Estás seguro de salir sin guardar la cotización?')) {
    store.reset()
    router.push('/dashboard')
  }
}
</script>

<style scoped>
.container {
  position: relative;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.codigo-cotizacion {
  font-size: 1rem;
  font-weight: bold;
  color: var(--primary);
}

.card.resumen {
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  padding: 1.5rem;
  border-radius: var(--border-radius);
  margin-top: 1.5rem;
}

.card.resumen h3 {
  margin-bottom: 0.5rem;
  color: var(--dark);
}

ul {
  list-style: none;
  padding-left: 0;
}

li {
  padding: 4px 0;
  border-bottom: 1px solid #eee;
}

.total {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary);
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 2rem;
}

button {
  padding: 12px 18px;
  border: none;
  border-radius: var(--border-radius);
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-weight: bold;
}

.guardar-btn {
  background-color: var(--primary);
  color: white;
}

.guardar-btn:hover {
  background-color: #006e53;
}

.volver-btn {
  background-color: #ccc;
  color: #000;
}

.volver-btn:hover {
  background-color: #bbb;
}

/* Overlay de carga */
.overlay-carga {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 6px solid #ddd;
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
