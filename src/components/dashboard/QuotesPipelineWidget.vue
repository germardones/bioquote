<template>
  <div class="panel">
    <div class="head">
      <h3 class="panel-title"><i class="fa-solid fa-funnel-dollar"></i> Pipeline de cotizaciones</h3>
      <RouterLink to="/cotizaciones" class="link">Ver todas</RouterLink>
    </div>
    <div v-if="loading" class="loading">Cargando...</div>
    <div v-else class="stages">
      <div v-for="s in stages" :key="s.status" class="stage" :style="{ '--c': s.color }">
        <div class="count">{{ s.count }}</div>
        <div class="label">{{ s.label }}</div>
        <div class="amount">{{ formatCurrency(s.amount) }}</div>
      </div>
    </div>

    <div v-if="!loading && recent.length > 0" class="recent">
      <h4 class="sub">Últimas cotizaciones</h4>
      <ul class="list">
        <li v-for="p in recent" :key="p.id" class="row" @click="$router.push(`/proyectos/${p.id}`)">
          <span class="badge" :class="statusClass(p.status)">{{ statusLabel(p.status) }}</span>
          <div class="body">
            <div class="title">{{ p.client_name }}</div>
            <div class="sub-line">{{ formatCurrency(p.financials?.quoted_price || 0) }}</div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { db, auth } from '../../firebase/firebaseConfig'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { STATUS, QUOTATION_STATUSES, statusLabel, statusCssClass } from '../../constants/projectStatus'

const loading = ref(true)
const projects = ref([])

onMounted(async () => {
  try {
    const user = auth.currentUser
    if (!user) return
    const snap = await getDocs(query(collection(db, 'projects'), where('owner_uid', '==', user.uid)))
    projects.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } finally { loading.value = false }
})

const stages = computed(() => {
  const defs = [
    { status: STATUS.DRAFT,          label: 'Borrador',     color: '#38bdf8' },
    { status: STATUS.SENT,           label: 'Enviada',      color: '#fbbf24' },
    { status: STATUS.IN_NEGOTIATION, label: 'Negociación',  color: '#a855f7' },
    { status: STATUS.APPROVED,       label: 'Aprobada',     color: '#4ade80' }
  ]
  return defs.map(d => {
    const subset = projects.value.filter(p => p.status === d.status)
    return {
      ...d,
      count: subset.length,
      amount: subset.reduce((s, p) => s + Number(p.financials?.quoted_price || 0), 0)
    }
  })
})

const recent = computed(() =>
  projects.value
    .filter(p => QUOTATION_STATUSES.includes(p.status))
    .sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0))
    .slice(0, 5)
)

const statusClass = (s) => statusCssClass(s)
const formatCurrency = (v) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v || 0)
</script>

<style scoped>
.panel { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; box-shadow: var(--shadow); }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.panel-title { margin: 0; font-size: 1rem; display: flex; align-items: center; gap: 8px; color: var(--text-main); }
.link { color: var(--primary); text-decoration: none; font-size: 0.82rem; font-weight: 600; }
.loading { padding: 1rem; text-align: center; color: var(--text-muted); }

.stages { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 1rem; }
.stage { background: var(--bg-app); border-left: 3px solid var(--c); padding: 0.75rem; border-radius: 6px; text-align: center; }
.stage .count { font-size: 1.8rem; font-weight: 800; color: var(--c); line-height: 1; }
.stage .label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-top: 4px; }
.stage .amount { font-size: 0.78rem; color: var(--text-main); margin-top: 2px; font-family: monospace; }

.recent { border-top: 1px solid var(--border-color); padding-top: 0.75rem; }
.sub { margin: 0 0 0.5rem 0; font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; }
.list { list-style: none; padding: 0; margin: 0; }
.row { display: flex; align-items: center; gap: 10px; padding: 6px 4px; border-bottom: 1px solid var(--border-color); cursor: pointer; }
.row:last-child { border-bottom: none; }
.row:hover { background: var(--bg-app); }
.body { flex: 1; min-width: 0; }
.title { font-weight: 600; color: var(--text-main); font-size: 0.88rem; }
.sub-line { color: var(--text-muted); font-size: 0.78rem; font-family: monospace; }
.badge { padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; }
.badge.draft           { background: rgba(56,189,248,0.15);  color: #38bdf8; }
.badge.sent            { background: rgba(251,191,36,0.15);  color: #fbbf24; }
.badge.in-negotiation  { background: rgba(168,85,247,0.15);  color: #a855f7; }
.badge.approved        { background: rgba(74,222,128,0.15);  color: #4ade80; }
.badge.rejected        { background: rgba(248,113,113,0.15); color: #f87171; }
.fa-chevron-right { color: var(--text-muted); font-size: 0.8rem; }

@media (max-width: 600px) {
  .stages { grid-template-columns: repeat(2, 1fr); }
}
</style>
