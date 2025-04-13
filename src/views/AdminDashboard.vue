<template>
  <div class="container">
    <h2>Panel de Administración</h2>

    <button @click="router.push('/dashboard')" class="btn-vendedor">
      Ir al Panel de Vendedores
    </button>

    <div class="admin-grid">
      <div class="card highlight clickeable" @click="router.push('/admin/cotizaciones')">
        <h3>Total Cotizaciones</h3>
        <p>{{ totalCotizaciones }}</p>
      </div>

      <div class="card clickeable" @click="router.push('/admin/clientes')">
        <h3>Clientes Únicos</h3>
        <p>{{ totalClientes }}</p>
      </div>

      <div class="card clickeable muted" @click="router.push('/admin/ventas-servicio')">
        <h3>Ventas Posibles</h3>
        <p>$ {{ formatearPesos(totalVentas) }}</p>
      </div>

      <div class="card vendedores wide-2">
  <h3>Top Vendedores</h3>
  <ul>
    <li v-for="(v, i) in topVendedores" :key="i">
      <strong>#{{ i + 1 }}</strong>
      {{ v.nombre || v.vendedorNombre || v.uid || 'Desconocido' }} —
      {{ v.total || 0 }} cotizaciones —
      ${{ formatearPesos(v.ventas) }}
    </li>
  </ul>
</div>


      <div class="card wide">
        <h3>Últimas Cotizaciones</h3>
        <ul>
          <li v-for="c in cotizacionesRecientes" :key="c.codigo">
            {{ c.codigo || 'Sin código' }} -
            {{ c.cliente?.nombre || 'Sin nombre' }} -
            ${{ formatearPesos(c.total) }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../firebase/firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const router = useRouter()

const totalCotizaciones = ref(0)
const totalClientes = ref(0)
const cotizacionesMes = ref(0)
const totalVentas = ref(0)
const topVendedores = ref([])
const cotizacionesRecientes = ref([])

const formatearPesos = (valor) => {
  return Number(valor || 0).toLocaleString('es-CL')
}

onMounted(async () => {
  const cotizacionesSnapshot = await getDocs(collection(db, 'cotizaciones'))
  const data = cotizacionesSnapshot.docs.map(doc => doc.data())

  totalCotizaciones.value = data.length
  totalVentas.value = data.reduce((acc, c) => acc + (c.total || 0), 0)

  const thisMonth = new Date().getMonth()
  const clientesUnicos = new Set()
  const cotizacionesMesTmp = []
  const vendedores = {}

  data.forEach(c => {
    if (c?.cliente?.rut) clientesUnicos.add(c.cliente.rut)

    const fecha = c.createdAt?.toDate?.()
    if (fecha && fecha.getMonth() === thisMonth) {
      cotizacionesMesTmp.push(c)
    }

    const uid = c.vendedorUID
    if (uid) {
      if (!vendedores[uid]) {
        vendedores[uid] = {
          uid,
          nombre: c.vendedorNombre || '',
          total: 0,
          ventas: 0
        }
      }

      vendedores[uid].total += 1
      vendedores[uid].ventas += c.total || 0
    }
  })

  totalClientes.value = clientesUnicos.size
  cotizacionesMes.value = cotizacionesMesTmp.length

  topVendedores.value = Object.values(vendedores).sort((a, b) => b.total - a.total)

  cotizacionesRecientes.value = data
    .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
    .slice(0, 5)
})
</script>

<style scoped>
.admin-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 2rem;
  align-items: stretch;
}

.card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  border-left: 5px solid var(--primary);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
}

.card.clickeable {
  cursor: pointer;
}

.card h3 {
  margin: 0 0 0.5rem;
}

.card.wide {
  grid-column: span 3;
}

.card.wide-2 {
  grid-column: span 1;
}

@media (min-width: 1024px) {
  .card.wide-2 {
    grid-column: span 2;
  }
}

.card.vendedores ul,
.card.wide ul {
  padding: 0;
  margin: 0;
  list-style: none;
}

.card ul li {
  padding: 0.4rem 0;
  border-bottom: 1px solid #eee;
}

.highlight {
  background-color: #e8f9f3;
  border-left-color: var(--primary);
}

.muted {
  background-color: #f5f5f5;
  border-left-color: #ccc;
}

.btn-vendedor {
  background-color: var(--primary);
  color: white;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  margin-bottom: 1rem;
}

.btn-vendedor:hover {
  background-color: #006e53;
}
</style>
