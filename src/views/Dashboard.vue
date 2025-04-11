<template>
  <div class="container">
    <h2>Dashboard - Vendedor</h2>

    <button class="nueva-cotizacion" @click="goToCotizacion">
      Nueva Cotización
    </button>

    <button v-if="esAdmin" class="admin-switch" @click="router.push('/admin')">
      Cambiar a Vista Admin
    </button>

    <div class="grid">
      <div class="card highlight">
        <h3>Total Cotizaciones</h3>
        <p>{{ totalCotizaciones }}</p>
      </div>

      <div class="card" @click="router.push('/clientes')">
        <h3>Clientes Atendidos</h3>
        <p>{{ totalClientes }}</p>
      </div>

      <div class="card">
        <h3>Cotizaciones este mes</h3>
        <p>{{ cotizacionesMes }}</p>
      </div>

      <div class="card full-width">
        <h3>Cotizaciones Recientes</h3>
        <ul class="lista-reciente">
          <li v-for="(c, i) in ultimasCotizaciones" :key="i">
            {{ c.codigo }} | {{ c.cliente?.nombre || 'Cliente' }} - ${{ c.total.toLocaleString() }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { db, auth } from '../firebase/firebaseConfig'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const router = useRouter()

const goToCotizacion = () => {
  router.push('/cotizar')
}

const totalCotizaciones = ref(0)
const totalClientes = ref(0)
const cotizacionesMes = ref(0)
const ultimasCotizaciones = ref([])
const esAdmin = ref(false)

const user = auth.currentUser

onMounted(async () => {
  if (!user) return

  // Consultar rol desde la colección usuarios
  const usuarioRef = doc(db, 'usuarios', user.uid)
  const usuarioSnap = await getDoc(usuarioRef)

  if (usuarioSnap.exists()) {
    const datos = usuarioSnap.data()
    if (datos.rol === 'admin') {
      esAdmin.value = true
    }
  }

  // Consultar cotizaciones
  const cotizacionesSnapshot = await getDocs(collection(db, 'cotizaciones'))
  const data = cotizacionesSnapshot.docs.map(doc => doc.data())

  const cotizacionesUsuario = data.filter(c => c.vendedorUID === user?.uid)

  totalCotizaciones.value = cotizacionesUsuario.length

  const clientesUnicos = new Set()
  const esteMes = new Date().getMonth()

  cotizacionesUsuario.forEach(c => {
    if (c?.cliente?.rut) clientesUnicos.add(c.cliente.rut)
    const fecha = c.createdAt?.toDate?.()
    if (fecha && fecha.getMonth() === esteMes) cotizacionesMes.value++
  })

  totalClientes.value = clientesUnicos.size
  ultimasCotizaciones.value = cotizacionesUsuario
    .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
    .slice(0, 5)
})
</script>

<style scoped>
.grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  margin-top: 2rem;
  justify-content: center;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.card {
  background: linear-gradient(to top right, #f9f9f9, #ffffff);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);
  border-left: 5px solid var(--primary);
  transition: transform 0.2s ease;
}

.card:hover {
  transform: translateY(-4px);
}

.card h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--dark);
}

.card p {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
}

.card.full-width {
  grid-column: span 1;
}

@media (min-width: 1024px) {
  .card.full-width {
    grid-column: span 3;
  }
}

.lista-reciente {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.lista-reciente li {
  padding: 6px 0;
  border-bottom: 1px solid #eee;
}

.nueva-cotizacion,
.admin-switch {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top: 1rem;
  margin-right: 1rem;
}

.nueva-cotizacion:hover,
.admin-switch:hover {
  background-color: #006e53;
}

.highlight {
  background-color: #e8f9f3;
  border-left-color: var(--primary);
}
</style>
