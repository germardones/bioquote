<template>
  <div class="container">
    <h2>Clientes Registrados</h2>

     <button @click="router.push('/dashboard')" class="btn-volver">
       <span class="icon">⬅️</span> Volver
     </button>

    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Razón Social</th>
          <th>RUT</th>
          <th>Correo</th>
          <th>Dirección</th>
          <th>Contacto</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cliente in clientes" :key="cliente.rut">
          <td>{{ cliente.nombre }}</td>
          <td>{{ cliente.razonSocial }}</td>
          <td>{{ cliente.rut }}</td>
          <td>{{ cliente.email || '-' }}</td>
          <td>{{ cliente.direccion || '-' }}</td>
          <td>{{ cliente.contacto || '-' }}</td>
          <td>
            <button class="btn-editar" @click="editarCliente(cliente)">Editar</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebaseConfig'
import { useRouter } from 'vue-router'

const router = useRouter()
const clientes = ref([])

onMounted(async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'projects'))
    const vistos = new Set()

    querySnapshot.forEach(doc => {
      const p = doc.data()
      // Estructura client_data (nueva) > cliente (legacy fallback)
      const data = p.client_data || p.cliente
      
      // Fallback básico si todo falla
      if (data && data.rut && !vistos.has(data.rut)) {
        vistos.add(data.rut)
        clientes.value.push(data)
      } else if (!data && p.client_name) {
        // Caso borde: Solo tenemos nombre
        if (!vistos.has(p.client_name)) {
            vistos.add(p.client_name)
            clientes.value.push({ 
                nombre: p.client_name, 
                rut: 'N/D', 
                razonSocial: 'N/D' 
            })
        }
      }
    })
  } catch (error) {
    console.error("Error al cargar clientes:", error)
  }
})

const editarCliente = (cliente) => {
  // Navega a la vista para editar el cliente
  router.push({ name: 'editar-cliente', params: { rut: cliente.rut } })
}
</script>

<style scoped>
.container {
  padding: 2rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th, td {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  text-align: left;
  color: var(--text-main);
}

th {
  background-color: var(--bg-app);
  color: var(--text-muted);
}


.btn-editar {
  background-color: var(--bg-header);
  color: var(--text-on-header);
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.btn-editar:hover {
  background-color: var(--primary);
  border-color: var(--primary);
}
</style>
