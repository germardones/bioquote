<template>
    <div class="container">
      <h2>Ventas por Tipo de Servicio</h2>
  
      <div v-if="Object.keys(ventasPorServicio).length">
        <table>
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Nº Cotizaciones</th>
              <th>Total Posible ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, servicio) in ventasPorServicio" :key="servicio">
              <td>{{ servicio }}</td>
              <td>{{ item.cantidad }}</td>
              <td>{{ item.total.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else>No hay datos disponibles.</p>
  
      <button @click="router.back()" class="btn-volver">Volver Atrás</button>
    </div>
  </template>
  
  <script setup>
  import { onMounted, ref } from 'vue'
  import { collection, getDocs } from 'firebase/firestore'
  import { db } from '../../firebase/firebaseConfig'
  import { useRouter } from 'vue-router'
  
  const ventasPorServicio = ref({})
  const router = useRouter()
  
  onMounted(async () => {
    const cotizacionesSnapshot = await getDocs(collection(db, 'cotizaciones'))
    const data = cotizacionesSnapshot.docs.map(doc => doc.data())
  
    const resumen = {}
  
    data.forEach(c => {
      const nombre = c.servicioBase?.nombre
      const monto = c.total || 0
      if (nombre) {
        if (!resumen[nombre]) {
          resumen[nombre] = { cantidad: 0, total: 0 }
        }
        resumen[nombre].cantidad++
        resumen[nombre].total += monto
      }
    })
  
    ventasPorServicio.value = resumen
  })
  </script>
  
  <style scoped>
  .container {
    padding: 2rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
  }
  th, td {
    padding: 0.75rem;
    border: 1px solid #ddd;
    text-align: left;
  }
  th {
    background-color: #f5f5f5;
  }
  .btn-volver {
    background-color: var(--primary);
    color: white;
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    margin-top: 1rem;
  }
  .btn-volver:hover {
    background-color: #006e53;
  }
  </style>