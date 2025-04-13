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

    <button @click="router.back()" class="btn-volver">← Volver</button>
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
    const snapshot = await getDocs(collection(db, 'cotizaciones'))
    cotizaciones.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (e) {
    console.error('Error al cargar cotizaciones:', e)
  }
}

const eliminarCotizacion = async (id) => {
  const confirmar = confirm('¿Estás seguro de que deseas eliminar esta cotización?')
  if (!confirmar) return

  try {
    await deleteDoc(doc(db, 'cotizaciones', id))
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
  border: 1px solid #ddd;
  padding: 0.75rem;
  text-align: left;
}

th {
  background-color: #f5f5f5;
}

.btn-volver {
  margin-top: 1.5rem;
  background-color: var(--primary);
  color: white;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}

.btn-volver:hover {
  background-color: #006e53;
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
