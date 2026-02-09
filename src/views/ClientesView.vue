<template>
  <div class="container fade-in">
    <div class="header">
        <div class="header-left">
            
            <div class="title-block">
                <h2>Directorio de Clientes</h2>
                <p class="subtitle">{{ filteredClientes.length }} clientes registrados</p>
            </div>
        </div>
        
        <div class="header-right">
            <div class="search-box">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input v-model="searchQuery" type="text" placeholder="Buscar..." />
            </div>
             <button class="btn-primary" @click="showModal = true">
                <i class="fa-solid fa-plus"></i> Nuevo Cliente
            </button>
            <button @click="router.back()" class="btn-volver">
                <i class="fa-solid fa-arrow-left"></i> Volver
            </button>
        </div>
    </div>

    <div class="table-container card">
        <table class="modern-table">
          <thead>
            <tr>
              <th>Cliente / Razón Social</th>
              <th>RUT</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredClientes.length === 0">
                <td colspan="3" class="empty-cell">
                    No se encontraron clientes coincidente.
                </td>
            </tr>
            <tr v-for="cliente in filteredClientes" :key="cliente.rut">
              <td data-label="Cliente">
                  <div class="client-info">
                      <span class="c-name">{{ cliente.nombre }}</span>
                      <span class="c-razon" v-if="cliente.razonSocial && cliente.razonSocial !== cliente.nombre">
                          <i class="fa-solid fa-building"></i> {{ cliente.razonSocial }}
                      </span>
                  </div>
              </td>
              <td data-label="RUT">
                  <span class="rut-badge">{{ cliente.rut }}</span>
              </td>
              <td class="text-right" data-label="Acciones">
                <button class="btn-action" @click="editarCliente(cliente)" title="Ver Detalle">
                    <span>Gestionar</span> <i class="fa-solid fa-chevron-right"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
    </div>
    
    <!-- Client Modal -->
    <ClientModal 
        v-if="showModal" 
        @close="showModal = false" 
        @save="handleSaveClient"
        :loading="savingClient"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { collection, getDocs, doc, setDoc } from 'firebase/firestore' // Added setDoc
import { db } from '../firebase/firebaseConfig'
import { useRouter } from 'vue-router'
import ClientModal from '../components/ClientModal.vue'

const router = useRouter()
const clientes = ref([])
const searchQuery = ref('')
const loading = ref(true)
const showModal = ref(false)
const savingClient = ref(false)

onMounted(async () => {
    await fetchClients()
})

const fetchClients = async () => {
    loading.value = true
    clientes.value = []
    try {
        // Fetch from 'clients' collection first (preferred source of truth now)
        const clientsSnapshot = await getDocs(collection(db, 'clients'))
        const existingRuts = new Set()
        
        clientsSnapshot.forEach(doc => {
            const data = doc.data()
            if (data.rut) {
                existingRuts.add(data.rut)
                clientes.value.push(data)
            }
        })

        // Fetch from projects for legacy/implicit clients not yet in 'clients'
        const projectsSnapshot = await getDocs(collection(db, 'projects'))

        projectsSnapshot.forEach(doc => {
            const p = doc.data()
            const data = p.client_data || p.cliente
            
            if (data && data.rut && !existingRuts.has(data.rut)) {
                existingRuts.add(data.rut)
                clientes.value.push(data)
            } else if (!data && p.client_name) {
                if (!existingRuts.has(p.client_name)) { // Use name as key if no rut
                     // Check again if we haven't added this name as a "rut" placeholder
                     const pseudoRut = 'N/D'
                     // Actually let's just push generic if name unique
                     // Simplification: just show what we have, deduplication is hard without ID
                }
            }
        })
        
        // Sort alpha
        clientes.value.sort((a,b) => (a.nombre || '').localeCompare(b.nombre || ''))

    } catch (error) {
        console.error("Error al cargar clientes:", error)
    } finally {
        loading.value = false
    }
}

const filteredClientes = computed(() => {
    if (!searchQuery.value) return clientes.value
    const q = searchQuery.value.toLowerCase()
    return clientes.value.filter(c => 
        (c.nombre && c.nombre.toLowerCase().includes(q)) || 
        (c.razonSocial && c.razonSocial.toLowerCase().includes(q)) ||
        (c.rut && c.rut.toLowerCase().includes(q))
    )
})

const editarCliente = (cliente) => {
    if(cliente.rut === 'N/D') {
        alert("Este cliente no tiene RUT válido para gestión detallada.")
        return
    }
    router.push({ name: 'CRMClientDetail', params: { rut: cliente.rut } })
}

const handleSaveClient = async (clientData) => {
    if (!clientData.rut) return
    savingClient.value = true
    try {
        // Use RUT as Document ID for uniqueness/easy lookup
        await setDoc(doc(db, 'clients', clientData.rut), clientData, { merge: true })
        
        // Refresh or add locally
        const idx = clientes.value.findIndex(c => c.rut === clientData.rut)
        if (idx >= 0) {
            clientes.value[idx] = clientData
        } else {
            clientes.value.push(clientData)
            clientes.value.sort((a,b) => a.nombre.localeCompare(b.nombre))
        }
        
        showModal.value = false
        // Optional: Navigate to detail?
    } catch (error) {
        console.error("Error saving client:", error)
        alert("Error al guardar cliente: " + error.message)
    } finally {
        savingClient.value = false
    }
}
</script>

<style scoped>
.container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Header */
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1.5rem;
}

.header-right {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
}

.btn-primary {
    background-color: var(--primary);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background-color 0.2s;
}

.btn-primary:hover {
    background-color: var(--primary-hover);
}

.header-left {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.header-right {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap; /* Auto wrap on small screens */
}

.btn-volver {
    background: none; 
    border: 1px solid var(--border-color); 
    border-radius: 8px;
    cursor: pointer;
    color: var(--text-muted); 
    font-size: 0.95rem;
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px; /* Match btn-primary height */
    transition: all 0.2s;
    height: 40px; /* Explicit height to match inputs/buttons */
}
.btn-volver:hover { 
    border-color: var(--primary);
    color: var(--primary); 
    background: var(--bg-surface);
}

.title-block h2 { margin: 0; font-size: 1.8rem; letter-spacing: -0.5px; }
.subtitle { margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.9rem; }

/* Search */
.search-box {
    position: relative;
    width: 300px;
}
.search-box i {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
}
.search-box input {
    width: 100%;
    padding: 10px 10px 10px 38px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-main);
    transition: all 0.2s;
}
.search-box input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
    outline: none;
}

/* Table Card */
.card {
    background: var(--bg-surface);
    border-radius: 12px;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
    overflow: hidden; /* For rounded corners on table */
}

.table-container {
    overflow-x: auto;
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
}

.modern-table th {
  background-color: var(--bg-app);
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.5px;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  text-align: left;
}

.modern-table td {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
  vertical-align: middle;
}

.modern-table tr:last-child td { border-bottom: none; }
.modern-table tr:hover td { background-color: var(--bg-app); }

.client-info { display: flex; flex-direction: column; gap: 4px; }
.c-name { font-weight: 600; font-size: 1rem; }
.c-razon { font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }

.rut-badge {
    background: var(--bg-app);
    border: 1px solid var(--border-color);
    padding: 4px 10px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.9rem;
    color: var(--text-muted);
}

.text-right { text-align: right; }

.btn-action {
  background-color: transparent;
  color: var(--primary);
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-action:hover {
  background-color: rgba(59, 130, 246, 0.1); 
  /* color stays primary */
}

.empty-cell {
    text-align: center;
    padding: 3rem !important;
    color: var(--text-muted);
    font-style: italic;
}

@media (max-width: 768px) {
  .header { flex-direction: column; align-items: stretch; }
  .header-right {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .search-box { width: 100%; }
  
  .btn-primary, .btn-volver {
    width: 100%;
    justify-content: center;
    height: 44px; /* Larger touch target */
  }

  .modern-table th, .modern-table td { padding: 1rem; }


  /* Table to Cards */
  .modern-table, .modern-table thead, .modern-table tbody, .modern-table th, .modern-table td, .modern-table tr {
    display: block;
    width: 100%;
  }

  .modern-table thead { display: none; }

  .modern-table tr {
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem;
    background: var(--bg-surface);
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .modern-table td {
    border: none;
    padding: 0.75rem 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: right;
    border-bottom: 1px solid var(--border-color);
  }

  .modern-table td:last-child {
      border-bottom: none;
  }
  
  .modern-table td:first-child {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
  }

  .modern-table td::before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--text-muted);
    font-size: 0.85rem;
    text-align: left;
    margin-right: auto; /* Push content to right, label to left */
  }
  
  /* Hide label for first child if it's the main title or handle differently */
  .modern-table td:first-child::before {
      margin-bottom: 4px;
  }
}
</style>
