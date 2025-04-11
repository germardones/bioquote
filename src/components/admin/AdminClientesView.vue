<template>
    <div class="container">
      <h2>Gestión de Clientes</h2>
      <button @click="router.push('/admin')" class="btn-volver">← Volver</button>

      <div v-if="clientes.length > 0">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Razón Social</th>
              <th>RUT</th>
              <th>Correo</th>
              <th>Contacto</th>
              <th>Dirección</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cliente in clientes" :key="cliente.rut">
              <td>
                <input v-model="cliente.nombre" type="text" />
              </td>
              <td>
                <input v-model="cliente.razonSocial" type="text" />
              </td>
              <td>
                <input :value="cliente.rut" type="text" disabled />
              </td>
              <td>
                <input v-model="cliente.email" type="email" />
              </td>
              <td>
                <input v-model="cliente.contacto" type="text" />
              </td>
              <td>
                <input v-model="cliente.direccion" type="text" />
              </td>
              <td>
                <button @click="guardarCliente(cliente)">Guardar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
  
      <p v-else>No hay clientes registrados.</p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { db } from '../../firebase/firebaseConfig'
  import { collection, getDocs, doc, updateDoc, query } from 'firebase/firestore'
  import { useRouter } from 'vue-router'
const router = useRouter()

  const clientes = ref([])
  
  onMounted(async () => {
    const q = query(collection(db, 'cotizaciones'))
    const snapshot = await getDocs(q)
    const vistos = new Set()
    snapshot.forEach((docSnap) => {
      const c = docSnap.data().cliente
      if (c?.rut && !vistos.has(c.rut)) {
        vistos.add(c.rut)
        clientes.value.push({ ...c })
      }
    })
  })
  
  const guardarCliente = async (cliente) => {
    try {
      const q = query(collection(db, 'cotizaciones'))
      const snapshot = await getDocs(q)
      const batch = []
  
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        if (data.cliente?.rut === cliente.rut) {
          const ref = doc(db, 'cotizaciones', docSnap.id)
          batch.push(updateDoc(ref, { cliente }))
        }
      })
  
      await Promise.all(batch)
      alert('Cliente actualizado correctamente.')
    } catch (e) {
      console.error('Error al actualizar cliente:', e)
      alert('Error al actualizar cliente.')
    }
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
  th,
  td {
    padding: 0.75rem;
    border: 1px solid #ddd;
    text-align: left;
  }
  th {
    background-color: #f5f5f5;
  }
  input {
    width: 100%;
    padding: 4px;
    box-sizing: border-box;
  }
  button {
    padding: 6px 12px;
    background-color: var(--primary);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  button:hover {
    background-color: #006e53;
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

  </style>
  