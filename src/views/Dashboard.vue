<template>
  <div class="container fade-in">
    <div class="header-row">
      <h2>Dashboard BioBio Code</h2>
    </div>

    <!-- Section: Operations -->
    <div class="dashboard-section category-operations">
      <h3 class="section-title"><i class="fa-solid fa-gears"></i> Operaciones</h3>
      <div class="grid">
        <div class="card" @click="router.push('/proyectos-en-curso')">
          <div class="card-icon"><i class="fa-solid fa-rocket"></i></div>
          <div>
            <h3>Proyectos en Curso</h3>
          </div>
        </div>

        <div class="card" @click="router.push('/usuarios')">
          <div class="card-icon"><i class="fa-solid fa-user-gear"></i></div>
          <div>
            <h3>Gestión de Usuarios</h3>
          </div>
        </div>
      </div>
    </div>

    <!-- Section: Sales -->
    <div class="dashboard-section category-sales">
      <h3 class="section-title"><i class="fa-solid fa-handshake"></i> Ventas</h3>
      <div class="grid">
        <div class="card clickable" @click="goToCotizacion">
          <div class="card-icon"><i class="fa-solid fa-file-circle-plus"></i></div>
          <div>
            <h3>Nueva Cotización</h3>
          </div>
        </div>

        <div class="card" @click="router.push('/cotizaciones')">
          <div class="card-icon"><i class="fa-solid fa-folder-open"></i></div>
          <div>
            <h3>Total Cotizaciones</h3>
          </div>
        </div>

        </div>
      </div>

    <!-- Section: CRM -->
    <div class="dashboard-section category-crm">
      <h3 class="section-title"><i class="fa-solid fa-address-book"></i> CRM & Clientes</h3>
      <div class="grid">
        <div class="card clickable" @click="router.push('/clientes')">
          <div class="card-icon"><i class="fa-solid fa-users"></i></div>
          <div>
             <h3>Directorio Clientes</h3>
          </div>
        </div>

        <div class="card clickable" @click="router.push('/crm/followup')">
          <div class="card-icon"><i class="fa-solid fa-list-check"></i></div>
          <div>
             <h3>Matriz de Seguimiento</h3>
          </div>
        </div>        
      </div>
    </div>

    <!-- Section: Financial -->
    <div class="dashboard-section category-financial">
      <h3 class="section-title"><i class="fa-solid fa-coins"></i> Financiero</h3>
      <div class="grid">
        <div class="card clickable" @click="router.push('/finanzas/ventas')">
          <div class="card-icon"><i class="fa-solid fa-money-check-dollar"></i></div>
          <div><h3>Total Vendido</h3></div>
        </div>
        <div class="card clickable" @click="router.push('/finanzas/recaudacion')">
          <div class="card-icon"><i class="fa-solid fa-sack-dollar"></i></div>
          <div><h3>Recaudado</h3></div>
        </div>
        <div class="card clickable" @click="router.push('/finanzas/flujo-caja')">
          <div class="card-icon"><i class="fa-solid fa-cash-register"></i></div>
          <div><h3>Flujo de Caja</h3></div>
        </div>
        <div class="card clickable" @click="router.push('/finanzas/proyeccion')">
          <div class="card-icon"><i class="fa-solid fa-chart-line"></i></div>
          <div><h3>Proyección</h3></div>
        </div>
        <div class="card clickable" @click="router.push('/finanzas/costos')">
          <div class="card-icon"><i class="fa-solid fa-wallet"></i></div>
          <div><h3>Costo Real</h3></div>
        </div>
      </div>
    </div>

      <div class="dashboard-section category-admin">
        <h3 class="section-title"><i class="fa-solid fa-user-gear"></i> Admin</h3>
        <div class="grid">
          <div class="card clickable" @click="router.push('/admin/config')">
          <div class="card-icon"><i class="fa-solid fa-sliders"></i></div>
          <div>
             <h3>Configuración</h3>
          </div>
        </div>
        </div>
      </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { db, auth } from '../firebase/firebaseConfig'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import { useFinancials } from '../composables/useFinancials' 

const router = useRouter()
const { kpis, fetchFinancialData } = useFinancials()

const goToCotizacion = () => { router.push('/cotizar') }

const totalCotizaciones = ref(0)
const totalClientes = ref(0)
const cotizacionesMes = ref(0)
const proyectosEnCurso = ref(0)
const esAdmin = ref(false)
const user = auth.currentUser

onMounted(async () => {
  if (!user) return
  fetchFinancialData()
  const usuarioRef = doc(db, 'usuarios', user.uid)
  const usuarioSnap = await getDoc(usuarioRef)
  
  if (usuarioSnap.exists()) {
      const role = usuarioSnap.data().rol
      // Permitir acceso a configuración a admin y vendedor
      if (role === 'admin' || role === 'vendedor') esAdmin.value = true
  }

  const projectsSnapshot = await getDocs(collection(db, 'projects'))
  const data = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  const projectsUsuario = data.filter(p => p.owner_uid === user?.uid)

  const clientesUnicos = new Set()
  const esteMes = new Date().getMonth()

  projectsUsuario.forEach(p => {
    const rut = p.client_data?.rut || p.client_name
    if (rut) clientesUnicos.add(rut)
    const fecha = p.created_at?.toDate?.()
    if (fecha && fecha.getMonth() === esteMes) cotizacionesMes.value++
    if (p.status === 'En Curso' || p.status === 'Completed') {
        proyectosEnCurso.value++
    } else {
        totalCotizaciones.value++
    }
  })
  totalClientes.value = clientesUnicos.size
})
</script>

<style scoped>
.container { width: 100%; max-width: 1400px; margin: 0 auto; padding: 2rem; }
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
.admin-switch { background-color: #333; color: white; padding: 8px 15px; border-radius: 6px; border: none; cursor: pointer; }
.dashboard-section { margin-bottom: 3rem; }
.section-title { font-size: 1.4rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--border-color); display: flex; align-items: center; gap: 12px; }

/* Base Card Styles */
.grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.card { 
    background: var(--bg-surface); 
    border-radius: 12px; 
    padding: 1.5rem; 
    box-shadow: var(--shadow); 
    display: flex; 
    align-items: center; 
    gap: 1.2rem; 
    cursor: pointer; 
    border: 1px solid var(--border-color); 
    transition: all 0.25s ease; 
    position: relative; 
    overflow: hidden; 
}
.card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px rgba(0, 0, 0, 0.12); }

.card-icon { font-size: 1.4rem; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 10px; transition: all 0.3s ease; }
.card:hover .card-icon { transform: scale(1.1); }
.card h3 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-main); }
.card p { margin: 0; color: var(--text-muted); font-size: 0.85rem; font-weight: 500; }

.card.highlight { background: linear-gradient(to right bottom, var(--bg-surface), rgba(59, 130, 246, 0.05)); border: 1px solid var(--primary); }
.card.highlight:hover { box-shadow: 0 12px 20px rgba(0, 131, 102, 0.15); border-color: var(--primary); }


/* Category Specific - Specificity applied last to ensure borders */
.category-operations .section-title { color: #3b82f6; border-bottom-color: rgba(59, 130, 246, 0.3); }
.category-operations .card { border-bottom: 4px solid #3b82f6; } /* Increased thickness */
.category-operations .card-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.category-operations .card:hover { border-color: var(--border-color); border-bottom-color: #3b82f6; } 

.category-sales .section-title { color: #22c55e; border-bottom-color: rgba(34, 197, 94, 0.3); }
.category-sales .card { border-bottom: 4px solid #22c55e; }
.category-sales .card-icon { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.category-sales .card:hover { border-color: var(--border-color); border-bottom-color: #22c55e; }

.category-financial .section-title { color: #f97316; border-bottom-color: rgba(249, 115, 22, 0.3); }
.category-financial .card { border-bottom: 4px solid #f97316; }
.category-financial .card-icon { background: rgba(249, 115, 22, 0.1); color: #f97316; }
.category-financial .card:hover { border-color: var(--border-color); border-bottom-color: #f97316; }

.category-crm .section-title { color: #8b5cf6; border-bottom-color: rgba(139, 92, 246, 0.3); }
.category-crm .card { border-bottom: 4px solid #8b5cf6; }
.category-crm .card-icon { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.category-crm .card:hover { border-color: var(--border-color); border-bottom-color: #8b5cf6; }

.category-admin .section-title { color: #dd3535; border-bottom-color: rgba(139, 92, 246, 0.3); }
.category-admin .card { border-bottom: 4px solid #dd3535; }
.category-admin .card-icon { background: rgba(139, 92, 246, 0.1); color: #dd3535; }
.category-admin .card:hover { border-color: var(--border-color); border-bottom-color: #dd3535; }

@media (max-width: 640px) {
  .container { padding: 1rem; }
  .grid { grid-template-columns: 1fr; gap: 1rem; }
  .card { padding: 1.2rem; }
  .section-title { font-size: 1.25rem; }
  .header-row { align-items: flex-start; }
}
</style>
