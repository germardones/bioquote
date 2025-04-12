<template>
  <div class="cotizacion-container" v-if="datosCargados">

    <h3 class="seccion">RESUMEN DE VENTAS</h3>

    <div class="resumen-tablas">
      <div class="tabla-bloque">
        <h4>Por Categoría</h4>
        <table class="tabla-servicios">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Total Cotizaciones</th>
              <th>Total ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, categoria) in ventasPorCategoria" :key="categoria">
              <td>{{ categoria }}</td>
              <td>{{ item.cantidad }}</td>
              <td>${{ item.total.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="tabla-bloque">
        <h4>Por Servicio</h4>
        <table class="tabla-servicios">
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Total Cotizaciones</th>
              <th>Total ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, servicio) in ventasPorServicio" :key="servicio">
              <td>{{ servicio }}</td>
              <td>{{ item.cantidad }}</td>
              <td>${{ item.total.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="tabla-bloque">
        <h4>Por Adicional</h4>
        <table class="tabla-servicios">
          <thead>
            <tr>
              <th>Adicional</th>
              <th>Veces Cotizado</th>
              <th>Total ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, adicional) in ventasPorAdicional" :key="adicional">
              <td>{{ adicional }}</td>
              <td>{{ item.cantidad }}</td>
              <td>${{ item.total.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <button class="volver-btn" @click="volverADashboard">Volver al Dashboard</button>
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

onMounted(async () => {
  const snapshot = await getDocs(collection(db, 'cotizaciones'))
  const data = snapshot.docs.map(doc => doc.data())

  const servicios = {}
  const categorias = {}
  const adicionales = {}

  data.forEach(c => {
    const serviciosCotizados = c.servicios || (c.servicioBase ? [c.servicioBase] : [])
    const categoriaNombre = s => s.categoria || 'Sin categoría'

    serviciosCotizados.forEach(s => {
      if (!s || !s.nombre) return

      // Por Servicio
      if (!servicios[s.nombre]) servicios[s.nombre] = { cantidad: 0, total: 0 }
      servicios[s.nombre].cantidad++
      servicios[s.nombre].total += s.cobroBase || 0

      // Por Categoría
      const cat = categoriaNombre(s)
      if (!categorias[cat]) categorias[cat] = { cantidad: 0, total: 0 }
      categorias[cat].cantidad++
      categorias[cat].total += s.cobroBase || 0
    })

    // Por Adicionales
    ;(c.adicionales || []).forEach(a => {
      if (!a || !a.nombre) return
      if (!adicionales[a.nombre]) adicionales[a.nombre] = { cantidad: 0, total: 0 }
      adicionales[a.nombre].cantidad++
      adicionales[a.nombre].total += a.precio || 0
    })
  })

  ventasPorServicio.value = servicios
  ventasPorCategoria.value = categorias
  ventasPorAdicional.value = adicionales
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

.volver-btn {
  background-color: var(--primary);
  color: white;
  padding: 12px 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.volver-btn:hover {
  background-color: #006e53;
}
</style>
