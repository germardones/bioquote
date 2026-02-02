<template>
  <div class="container">
    <h2>Panel de Administración</h2>

    <button @click="router.push('/dashboard')" class="btn-vendedor">
      Ir al Panel de Vendedores
    </button>

    <div class="admin-grid">
      <div class="card highlight clickeable" @click="router.push('/admin/cotizaciones')">
        <div class="card-icon"><i class="fa-solid fa-folder-open"></i></div>
        <div>
          <h3>Total Cotizaciones</h3>
        </div>
      </div>

      <div class="card clickeable" @click="router.push('/admin/clientes')">
        <div class="card-icon purple"><i class="fa-solid fa-users"></i></div>
        <div>
          <h3>Clientes Únicos</h3>
        </div>
      </div>

      <div class="card clickeable muted" @click="router.push('/admin/ventas-servicio')">
        <div class="card-icon blue"><i class="fa-solid fa-chart-line"></i></div>
        <div>
          <h3>Ventas Posibles</h3>
        </div>
      </div>

      <div class="card vendedores wide-2">
        <div class="card-header">
           <i class="fa-solid fa-trophy icon-accent"></i>
           <h3>Top Vendedores</h3>
        </div>
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
        <div class="card-header">
           <i class="fa-solid fa-clock-rotate-left icon-accent"></i>
           <h3>Últimas Cotizaciones</h3>
        </div>
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
  background: var(--bg-surface);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  gap: 1.2rem;
  border: 1px solid var(--border-color);
  transition: all 0.25s ease;
}

.card.clickeable {
  cursor: pointer;
}

.card.clickeable:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.08);
  border-color: var(--primary);
}

.card-icon {
    font-size: 1.4rem;
    background: var(--bg-app);
    color: var(--text-muted);
    width: 48px; height: 48px;
    display: flex;
    align-items: center; justify-content: center;
    border-radius: 10px;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 1rem;
}

.card-header h3 {
    margin: 0;
}

.icon-accent {
    color: var(--primary);
    font-size: 1.2rem;
}

.card h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
}

.card p {
  margin: 0;
  color: var(--text-main);
  font-size: 1.1rem;
  font-weight: bold;
}

.card.wide, .card.vendedores {
    flex-direction: column;
    align-items: flex-start;
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

.card ul {
  padding: 0;
  margin: 0;
  list-style: none;
  width: 100%;
}

.card ul li {
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9rem;
  color: var(--text-muted);
}

.card ul li:last-child {
    border-bottom: none;
}

.card-icon.purple { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
.card-icon.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

.highlight {
  background: var(--bg-surface);
  border-left: 4px solid var(--primary);
}
.highlight .card-icon {
    background: rgba(34, 197, 94, 0.1);
    color: #166534;
}

.muted {
  background: var(--bg-app);
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
  transition: all 0.2s;
}

.btn-vendedor:hover {
  background-color: #006e53;
  transform: scale(1.02);
}
</style>
