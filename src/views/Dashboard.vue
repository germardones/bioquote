<template>
  <div class="container">
    <h2>Dashboard</h2>
    <button class="nueva-cotizacion" @click="goToCotizacion">
      ➕ Nueva Cotización
    </button>

    <div class="grid">
      <div class="card highlight">
        <h3>Total Cotizaciones</h3>
        <p>{{ totalCotizaciones }}</p>
      </div>

      <div class="card">
        <h3>Clientes Registrados</h3>
        <p>{{ totalClientes }}</p>
      </div>

      <div class="card">
        <h3>Cotizaciones este mes</h3>
        <p>{{ cotizacionesMes }}</p>
      </div>

      <div class="card muted">
        <h3>Ventas por Vendedor</h3>
        <p>(Próximamente)</p>
      </div>

      <div class="card vendedores">
        <h3>Top Vendedores</h3>
        <ul>
          <li v-for="(v, index) in topVendedores" :key="index">
            <strong>#{{ index + 1 }}</strong> {{ v.nombre || v.uid }} — {{ v.total }} cotizaciones
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { db, auth } from '../firebase/firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'
import { useRouter } from 'vue-router'
const router = useRouter()


const goToCotizacion = () => {
  router.push('/cotizar')
}


const totalCotizaciones = ref(0)
const totalClientes = ref(0)
const cotizacionesMes = ref(0)
const topVendedores = ref([])

const user = auth.currentUser

onMounted(async () => {
  const cotizacionesSnapshot = await getDocs(collection(db, 'cotizaciones'))

  const cotizacionesData = cotizacionesSnapshot.docs.map(doc => doc.data())

  totalCotizaciones.value = cotizacionesData.filter(c => c.vendedorUID === user.uid).length

  const clientesUnicos = new Set()
  const cotizacionesEsteMes = []

  const thisMonth = new Date().getMonth()

  // Conteo por vendedor
  const conteoVendedores = {}

  cotizacionesData.forEach(c => {
    if (c?.cliente?.rut && c.vendedorUID === user.uid) {
      clientesUnicos.add(c.cliente.rut)
    }

    const fecha = c.createdAt?.toDate?.()
    if (fecha && fecha.getMonth() === thisMonth && c.vendedorUID === user.uid) {
      cotizacionesEsteMes.push(c)
    }

    if (c.vendedorUID) {
      conteoVendedores[c.vendedorUID] = (conteoVendedores[c.vendedorUID] || 0) + 1
    }
  })

  totalClientes.value = clientesUnicos.size
  cotizacionesMes.value = cotizacionesEsteMes.length

  topVendedores.value = Object.entries(conteoVendedores)
    .map(([uid, total]) => ({ uid, total }))
    .sort((a, b) => b.total - a.total)
})
</script>

<style scoped>
.grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  margin-top: 2rem;
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

.card.vendedores ul {
  padding: 0;
  margin: 0;
  list-style: none;
}

.card.vendedores li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #ddd;
}

.card.vendedores li:last-child {
  border-bottom: none;
}

.card.highlight {
  background-color: #e8f9f3;
  border-left-color: var(--primary);
}

.card.muted {
  background-color: #f3f3f3;
  color: #999;
  border-left-color: #ccc;
}
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.nueva-cotizacion {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.nueva-cotizacion:hover {
  background-color: #006e53;
}

</style>
