<template>
  <div class="container">
    <h2>Clientes Registrados</h2>

    <button @click="router.back()" class="btn-volver">← Volver atrás</button>

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
  const querySnapshot = await getDocs(collection(db, 'cotizaciones'))
  const vistos = new Set()

  querySnapshot.forEach(doc => {
    const data = doc.data().cliente
    if (data && !vistos.has(data.rut)) {
      vistos.add(data.rut)
      clientes.value.push(data)
    }
  })
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
  margin-bottom: 1rem;
}

.btn-volver:hover {
  background-color: #006e53;
}

.btn-editar {
  background-color: #071434;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.btn-editar:hover {
  background-color: #0a1d4c;
}
</style>
