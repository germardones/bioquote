<template>
  <div class="panel">
    <h3 class="panel-title"><i class="fa-solid fa-hourglass-half"></i> Pendientes de aprobación</h3>
    <div v-if="loading" class="loading">Cargando...</div>
    <div v-else-if="items.length === 0" class="empty">Sin pendientes 🎉</div>
    <ul v-else class="list">
      <li v-for="(it, i) in items" :key="i" class="row" @click="$router.push(it.link)">
        <span class="pill" :class="it.type">{{ it.typeLabel }}</span>
        <div class="body">
          <div class="title">{{ it.title }}</div>
          <div class="sub">{{ it.sub }}</div>
        </div>
        <i class="fa-solid fa-chevron-right"></i>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db, auth } from '../../firebase/firebaseConfig'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { STATUS } from '../../constants/projectStatus'

const items = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const user = auth.currentUser
    if (!user) return
    const [pSnap, aSnap] = await Promise.all([
      getDocs(query(collection(db, 'projects'), where('owner_uid', '==', user.uid))),
      getDocs(collection(db, 'absences')).catch(() => ({ docs: [] }))
    ])

    const out = []

    // Cotizaciones enviadas / en negociación
    pSnap.docs.forEach(d => {
      const p = { id: d.id, ...d.data() }
      if (p.status === STATUS.SENT || p.status === STATUS.IN_NEGOTIATION) {
        out.push({
          type: 'quote',
          typeLabel: 'Cotización',
          title: `${p.client_name}`,
          sub: `Esperando respuesta · ${p.status === STATUS.SENT ? 'Enviada' : 'En Negociación'}`,
          link: `/proyectos/${p.id}`
        })
      }
    })

    // Solicitudes de ausencia pendientes
    aSnap.docs.forEach(d => {
      const a = { id: d.id, ...d.data() }
      if (a.status === 'Pendiente') {
        out.push({
          type: 'absence',
          typeLabel: 'Ausencia',
          title: `${a.workerName}`,
          sub: `${a.type} · ${a.startDate} → ${a.endDate} (${a.days} día/s)`,
          link: '/equipo/ausencias'
        })
      }
    })

    items.value = out.slice(0, 8)
  } finally { loading.value = false }
})
</script>

<style scoped>
.panel { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; box-shadow: var(--shadow); }
.panel-title { margin: 0 0 0.75rem 0; font-size: 1rem; display: flex; align-items: center; gap: 8px; color: var(--text-main); }
.loading, .empty { padding: 1rem; text-align: center; color: var(--text-muted); }
.list { list-style: none; margin: 0; padding: 0; max-height: 320px; overflow-y: auto; }
.row { display: flex; align-items: center; gap: 10px; padding: 8px 6px; border-bottom: 1px solid var(--border-color); cursor: pointer; }
.row:last-child { border-bottom: none; }
.row:hover { background: var(--bg-app); }
.pill { padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; }
.pill.quote { background: rgba(251,191,36,0.15); color: #f59e0b; }
.pill.absence { background: rgba(245,158,11,0.15); color: #d97706; }
.body { flex: 1; min-width: 0; }
.title { font-weight: 600; color: var(--text-main); font-size: 0.9rem; }
.sub { color: var(--text-muted); font-size: 0.78rem; }
.fa-chevron-right { color: var(--text-muted); font-size: 0.8rem; }
</style>
