<template>
    <div class="container">
      <h2>Gestión de Clientes</h2>
      <button @click="router.push('/admin')" class="btn-volver">
        <span class="icon">⬅️</span> Volver
      </button>

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
    const q = query(collection(db, 'projects'))
    const snapshot = await getDocs(q)
    const vistos = new Set()
    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      // client_data struct or fallback
      const c = data.client_data || { 
        nombre: data.client_name, 
        // Fallbacks if data is missing, though Step5 saves it all
        rut: 'N/A', 
        email: 'N/A' 
      }
      
      if (c?.rut && !vistos.has(c.rut)) {
        vistos.add(c.rut)
        clientes.value.push({ ...c })
      }
    })
  })
  
  const guardarCliente = async (cliente) => {
    try {
      const q = query(collection(db, 'projects'))
      const snapshot = await getDocs(q)
      const batch = []
  
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        if (data.client_data?.rut === cliente.rut) {
          const ref = doc(db, 'projects', docSnap.id)
          batch.push(updateDoc(ref, { 
            client_data: cliente,
            client_name: cliente.nombre // Update redundancy
          }))
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
    border: 1px solid var(--border-color);
    text-align: left;
    color: var(--text-main);
  }
  th {
    background-color: var(--bg-app);
    color: var(--text-muted);
  }
  input {
    width: 100%;
    padding: 4px;
    box-sizing: border-box;
    background: var(--input-bg);
    color: var(--text-main);
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }
  button {
    padding: 6px 12px;
    background-color: var(--primary);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  button:hover {
    background-color: var(--primary-hover);
  }
  
  @media (max-width: 640px) {
    .container {
      padding: 1rem;
    }

    table, thead, tbody, th, td, tr {
      display: block;
      width: 100%;
    }

    thead {
      display: none;
    }

    tr {
      background: var(--bg-surface);
      margin-bottom: 1rem;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem;
      box-shadow: var(--shadow);
    }

    td {
      border: none;
      padding: 0.5rem 0;
      position: relative;
    }

    /* Add labels for context */
    td:nth-of-type(1)::before { content: "Nombre"; display: block; font-weight: bold; color: var(--text-muted); font-size: 0.8rem; }
    td:nth-of-type(2)::before { content: "Razón Social"; display: block; font-weight: bold; color: var(--text-muted); font-size: 0.8rem; }
    td:nth-of-type(3)::before { content: "RUT"; display: block; font-weight: bold; color: var(--text-muted); font-size: 0.8rem; }
    td:nth-of-type(4)::before { content: "Correo"; display: block; font-weight: bold; color: var(--text-muted); font-size: 0.8rem; }
    td:nth-of-type(5)::before { content: "Contacto"; display: block; font-weight: bold; color: var(--text-muted); font-size: 0.8rem; }
    td:nth-of-type(6)::before { content: "Dirección"; display: block; font-weight: bold; color: var(--text-muted); font-size: 0.8rem; }

    td:last-child {
      text-align: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
    }
    
    button {
      width: 100%;
    }
  }
  </style>
  