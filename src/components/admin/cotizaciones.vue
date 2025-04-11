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
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in cotizaciones" :key="c.codigo">
            <td>{{ c.codigo }}</td>
            <td>{{ c.cliente?.nombre }}</td>
            <td>{{ c.cliente?.razonSocial }}</td>
            <td>${{ c.total.toLocaleString() }}</td>
            <td>{{ c.vendedorNombre || c.vendedorUID }}</td>
            <td>{{ formatFecha(c.createdAt?.toDate?.()) }}</td>
          </tr>
        </tbody>
      </table>
  
      <button @click="router.back()" class="btn-volver">← Volver</button>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { db } from '../../firebase/firebaseConfig'
  import { collection, getDocs } from 'firebase/firestore'
  import { useRouter } from 'vue-router'
  
  const cotizaciones = ref([])
  const router = useRouter()
  
  onMounted(async () => {
    const snapshot = await getDocs(collection(db, 'cotizaciones'))
    cotizaciones.value = snapshot.docs.map(doc => doc.data())
  })
  
  const formatFecha = (fecha) => {
    if (!fecha) return 'N/D'
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric', month: 'short', day: '2-digit'
    }).format(fecha)
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
  </style>
  