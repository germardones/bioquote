<template>
  <div class="container fade-in">
    <div class="header-row">
      <h2>Dashboard BioBio Code</h2>
      <button v-if="esAdmin" class="admin-switch" @click="router.push('/admin')">
        Cambiar a Vista Admin
      </button>
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
        <div class="card highlight" @click="goToCotizacion">
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

        <div class="card" @click="router.push('/clientes')">
          <div class="card-icon"><i class="fa-solid fa-users"></i></div>
          <div>
             <h3>CRM Clientes</h3>
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
  if (usuarioSnap.exists() && usuarioSnap.data().rol === 'admin') esAdmin.value = true

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

.category-operations .section-title { color: #3b82f6; border-bottom-color: rgba(59, 130, 246, 0.3); }
.category-operations .card { border-bottom: 3px solid #3b82f6; }
.category-operations .card-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

.category-sales .section-title { color: #22c55e; border-bottom-color: rgba(34, 197, 94, 0.3); }
.category-sales .card { border-bottom: 3px solid #22c55e; }
.category-sales .card-icon { background: rgba(34, 197, 94, 0.1); color: #22c55e; }

.category-financial .section-title { color: #f97316; border-bottom-color: rgba(249, 115, 22, 0.3); }
.category-financial .card { border-bottom: 3px solid #f97316; }
.category-financial .card-icon { background: rgba(249, 115, 22, 0.1); color: #f97316; }

.grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.card { background: var(--bg-surface); border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow); display: flex; align-items: center; gap: 1.2rem; cursor: pointer; border: 1px solid var(--border-color); transition: all 0.25s ease; position: relative; overflow: hidden; }
.card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px rgba(0, 0, 0, 0.12); }
.category-operations .card:hover { border-color: #3b82f6; }
.category-sales .card:hover { border-color: #22c55e; }
.category-financial .card:hover { border-color: #f97316; }

.card-icon { font-size: 1.4rem; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 10px; transition: all 0.3s ease; }
.card:hover .card-icon { transform: scale(1.1); }
.card h3 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-main); }
.card p { margin: 0; color: var(--text-muted); font-size: 0.85rem; font-weight: 500; }

@media (max-width: 640px) {
  .container { padding: 1rem; }
  .grid { grid-template-columns: 1fr; gap: 1rem; }
  .card { padding: 1.2rem; }
  .section-title { font-size: 1.25rem; }
  .header-row { align-items: flex-start; }
}
</style>
