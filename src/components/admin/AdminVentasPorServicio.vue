<template>
  <div class="cotizacion-container" v-if="datosCargados">

    <h3 class="seccion">RESUMEN DE VENTAS</h3>
    <p class="total-global">
      Ventas posibles: ${{ totalVentas.toLocaleString() }}
    </p>

    <div class="resumen-tablas">
      <div class="tabla-bloque" v-if="Object.keys(ventasPorServicio).length">
        <h4>Por Complejidad</h4>
        <table class="tabla-servicios">
          <thead>
            <tr>
              <th>Factor</th>
              <th>Total Proyectos</th>
              <th>Total ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, key) in ventasPorServicio" :key="key">
              <td>{{ key }}</td>
              <td>{{ item.cantidad }}</td>
              <td>${{ item.total.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <button class="btn-volver" @click="volverADashboard">
      <span class="icon">⬅️</span> Volver
    </button>
  </div>

  <div v-else>
    <p>Cargando datos de cotización...</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebaseConfig'
import { useRouter } from 'vue-router'

const router = useRouter()
const datosCargados = ref(false)

const ventasPorServicio = ref({})
const ventasPorCategoria = ref({})
const ventasPorAdicional = ref({})
const totalVentas = ref(0)

onMounted(async () => {
  const snapshot = await getDocs(collection(db, 'projects'))
  const data = snapshot.docs.map(doc => doc.data())

  const porComplejidad = {}
  
  data.forEach(p => {
    // Agrupar por complejidad
    const complexity = p.specs?.complexity || 1.0
    const key = `Complejidad ${complexity}x`
    
    if (!porComplejidad[key]) porComplejidad[key] = { cantidad: 0, total: 0 }
    porComplejidad[key].cantidad++
    const valor = p.financials?.quoted_price || 0
    porComplejidad[key].total += valor
    totalVentas.value += valor
  })

  // Reutilizamos la estructura de "ventasPorServicio" para complejidad por ahora
  ventasPorServicio.value = porComplejidad
  
  // Limpiamos las otras
  ventasPorCategoria.value = {}
  ventasPorAdicional.value = {}
  
  datosCargados.value = true
})

const volverADashboard = () => router.push('/dashboard')
</script>

<style scoped>
.cotizacion-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem;
}

.resumen-tablas {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  margin-bottom: 2rem;
}

.tabla-bloque {
  flex: 1 1 300px;
}

.tabla-servicios {
  width: 100%;
  border-collapse: collapse;
}

.tabla-servicios th,
.tabla-servicios td {
  border: 1px solid #ddd;
  padding: 0.75rem;
  text-align: left;
}

.tabla-servicios th {
  background-color: #f5f5f5;
}

.total-global {
  margin-top: 0.5rem;
  font-weight: bold;
}

.btn-volver {
  background-color: var(--primary);
  color: white;
  padding: 12px 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
}

.btn-volver:hover {
  background-color: var(--primary-hover);
}
</style>
