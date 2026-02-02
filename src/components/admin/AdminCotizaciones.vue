<template>
  <div class="container">
    <h2>Listado de Cotizaciones</h2>

    <table class="cotizaciones-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Cliente</th>
          <th>Razón Social</th>
          <th>Total</th>
          <th>Vendedor</th>
          <th>Fecha</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in cotizaciones" :key="c.codigo || c.id">
          <td>{{ c.codigo || 'Sin código' }}</td>
          <td>{{ c.cliente?.nombre || 'N/D' }}</td>
          <td>{{ c.cliente?.razonSocial || 'N/D' }}</td>
          <td>${{ (c.total || 0).toLocaleString() }}</td>
          <td>{{ c.vendedorNombre || c.vendedorUID || 'N/D' }}</td>
          <td>{{ formatFecha(c.createdAt?.toDate?.()) }}</td>
          <td>
            <button class="btn-eliminar" @click="eliminarCotizacion(c.id)">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>

    <button @click="router.back()" class="btn-volver">
      <span class="icon">⬅️</span> Volver
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../../firebase/firebaseConfig'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const cotizaciones = ref([])
const router = useRouter()

onMounted(async () => {
  await cargarCotizaciones()
})

const cargarCotizaciones = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'projects'))
    cotizaciones.value = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        codigo: doc.id.substring(0, 8).toUpperCase(),
        cliente: { 
          nombre: data.client_name, 
          razonSocial: data.client_data?.razonSocial 
        },
        total: data.financials?.quoted_price,
        vendedorNombre: data.sales_rep_name,
        createdAt: data.created_at
      }
    })
  } catch (e) {
    console.error('Error al cargar proyectos:', e)
  }
}

const eliminarCotizacion = async (id) => {
  const confirmar = confirm('¿Estás seguro de que deseas eliminar esta cotización?')
  if (!confirmar) return

  try {
    await deleteDoc(doc(db, 'projects', id))
    cotizaciones.value = cotizaciones.value.filter(c => c.id !== id)
  } catch (error) {
    console.error('Error al eliminar cotización:', error)
    alert('No se pudo eliminar la cotización.')
  }
}

const formatFecha = (fecha) => {
  if (!fecha) return 'N/D'
  try {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).format(fecha)
  } catch {
    return 'Fecha inválida'
  }
}
</script>

<style scoped>
.container {
  padding: 2rem;
}

.cotizaciones-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th, td {
  border: 1px solid var(--border-color);
  padding: 0.75rem;
  text-align: left;
  color: var(--text-main);
}

th {
  background-color: var(--bg-app);
  color: var(--text-muted);
}


.btn-eliminar {
  background-color: transparent;
  border: none;
  color: #d9534f;
  cursor: pointer;
  font-size: 1.2rem;
}

.btn-eliminar:hover {
  color: #b52b27;
}
</style>
