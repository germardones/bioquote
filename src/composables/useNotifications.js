import { ref, computed } from 'vue'
import { db, auth } from '../firebase/firebaseConfig'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { STATUS } from '../constants/projectStatus'
import { TASK_STATUS } from '../constants/tasks'

/**
 * Derives notifications from the existing data (projects, tasks, expenses).
 * Read-state is stored in localStorage keyed by deterministic notification IDs,
 * so dismissals persist across sessions (per-device).
 *
 * No new Firestore collection — the plan's "leído/no leído" requirement is
 * served by localStorage to keep reads minimal. If multi-device dismiss-sync
 * is later needed, swap localStorage for a `notification_reads/{uid}` doc.
 */

const READ_KEY = 'bb_notifs_read_v1'
const loadRead = () => {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')) }
  catch { return new Set() }
}
const saveRead = (set) => localStorage.setItem(READ_KEY, JSON.stringify([...set]))

export function useNotifications() {
  const items = ref([])
  const loading = ref(false)
  const readIds = ref(loadRead())

  const unreadCount = computed(() => items.value.filter(n => !readIds.value.has(n.id)).length)

  const markAsRead = (id) => {
    readIds.value.add(id)
    saveRead(readIds.value)
    readIds.value = new Set(readIds.value) // trigger reactivity
  }
  const markAllRead = () => {
    items.value.forEach(n => readIds.value.add(n.id))
    saveRead(readIds.value)
    readIds.value = new Set(readIds.value)
  }

  const daysAgo = (iso) => {
    if (!iso) return 999
    const d = typeof iso === 'string' ? new Date(iso) : (iso?.toDate ? iso.toDate() : new Date(iso))
    return Math.floor((Date.now() - d.getTime()) / 86400000)
  }
  const daysFromNow = (iso) => {
    if (!iso) return null
    const d = new Date(iso + 'T00:00:00')
    return Math.ceil((d.getTime() - Date.now()) / 86400000)
  }

  async function generate() {
    loading.value = true
    items.value = []
    const user = auth.currentUser
    if (!user) { loading.value = false; return }

    try {
      // Read source data in parallel
      const [pSnap, tSnap, feSnap, eSnap] = await Promise.all([
        getDocs(query(collection(db, 'projects'), where('owner_uid', '==', user.uid))),
        getDocs(collection(db, 'tasks')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'fixed_expenses')).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, 'expenses'), where('ownerUid', '==', user.uid))).catch(() => ({ docs: [] }))
      ])

      const projects = pSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const tasks = tSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      const today = new Date().toISOString().slice(0, 10)
      const list = []

      // 1. Quotes (status Sent/InNegotiation) > 7 days without status change
      for (const p of projects) {
        if (![STATUS.SENT, STATUS.IN_NEGOTIATION].includes(p.status)) continue
        const lastChange = p.history?.length ? p.history[p.history.length - 1].at : p.updated_at
        if (daysAgo(lastChange) >= 7) {
          list.push({
            id: `stale-quote-${p.id}`,
            type: 'warning',
            icon: 'fa-clock',
            title: `Cotización sin avance: ${p.client_name}`,
            detail: `${daysAgo(lastChange)} días sin cambio de estado`,
            link: `/proyectos/${p.id}`,
            at: lastChange
          })
        }
      }

      // 1b. Cotizaciones cuya validez expira pronto o ya expiró
      for (const p of projects) {
        if (![STATUS.DRAFT, STATUS.SENT, STATUS.IN_NEGOTIATION].includes(p.status)) continue
        if (!p.validUntil) continue
        const dist = daysFromNow(p.validUntil)
        if (dist === null) continue
        if (dist < 0) {
          list.push({
            id: `expired-quote-${p.id}`,
            type: 'danger',
            icon: 'fa-calendar-xmark',
            title: `Cotización vencida: ${p.client_name}`,
            detail: `Venció hace ${-dist} día(s). Renegocia o renueva.`,
            link: `/cotizar/edit/${p.id}`,
            at: p.validUntil
          })
        } else if (dist <= 5) {
          list.push({
            id: `expiring-quote-${p.id}`,
            type: 'warning',
            icon: 'fa-calendar-day',
            title: `Cotización por vencer: ${p.client_name}`,
            detail: dist === 0 ? 'Vence hoy' : `Vence en ${dist} día(s)`,
            link: `/cotizar/edit/${p.id}`,
            at: p.validUntil
          })
        }
      }

      // 2. Project deadlines within 3 days (use latest open milestone)
      for (const p of projects) {
        if (p.status !== STATUS.EN_CURSO) continue
        const ms = (p.milestones || []).filter(m => !m.done && m.dueDate)
        if (ms.length === 0) continue
        const nearest = ms.reduce((a, b) => (a.dueDate < b.dueDate ? a : b))
        const dist = daysFromNow(nearest.dueDate)
        if (dist !== null && dist <= 3) {
          list.push({
            id: `due-project-${p.id}-${nearest.id}`,
            type: dist < 0 ? 'danger' : (dist === 0 ? 'danger' : 'warning'),
            icon: 'fa-flag-checkered',
            title: `Hito próximo: ${p.client_name}`,
            detail: dist < 0
              ? `"${nearest.title}" venció hace ${-dist} día(s)`
              : dist === 0 ? `"${nearest.title}" vence hoy`
              : `"${nearest.title}" vence en ${dist} día(s)`,
            link: `/proyectos/${p.id}`,
            at: nearest.dueDate
          })
        }
      }

      // 3. Tasks with deadline within 24h, not completed
      for (const t of tasks) {
        if (t.status === TASK_STATUS.COMPLETADA) continue
        if (!t.dueDate) continue
        const dist = daysFromNow(t.dueDate)
        if (dist !== null && dist <= 1) {
          list.push({
            id: `due-task-${t.id}`,
            type: dist < 0 ? 'danger' : 'warning',
            icon: 'fa-list-check',
            title: `Tarea próxima: ${t.title}`,
            detail: dist < 0
              ? `vencida hace ${-dist} día(s)`
              : dist === 0 ? 'vence hoy' : 'vence mañana',
            link: '/tareas',
            at: t.dueDate
          })
        }
      }

      // 4. Cash flow in red — simplified: pending > 2x monthly fixed expenses
      const totalCollected = projects
        .filter(p => [STATUS.EN_CURSO, STATUS.COMPLETED].includes(p.status))
        .reduce((s, p) => s + (p.payments || []).reduce((x, pay) => x + Number(pay.amount || 0), 0), 0)
      const totalSold = projects
        .filter(p => [STATUS.EN_CURSO, STATUS.COMPLETED].includes(p.status))
        .reduce((s, p) => s + Number(p.financials?.quoted_price || 0), 0)
      const totalPending = totalSold - totalCollected
      const monthlyFixed = feSnap.docs.reduce((s, d) => s + Number(d.data().amount || 0), 0)
      const monthlyOps = eSnap.docs
        .filter(d => (d.data().date || '').startsWith(today.slice(0, 7)))
        .reduce((s, d) => s + Number(d.data().amount || 0), 0)
      const monthlyOutflow = monthlyFixed + monthlyOps
      // "Red" if pending receivables don't cover 2 months of outflows
      if (monthlyOutflow > 0 && totalPending < monthlyOutflow * 2 && totalPending < monthlyOutflow) {
        list.push({
          id: `cashflow-red-${today.slice(0, 7)}`,
          type: 'danger',
          icon: 'fa-triangle-exclamation',
          title: 'Flujo de caja en zona roja',
          detail: `Pendiente por cobrar (${currency(totalPending)}) no cubre 1 mes de egresos (${currency(monthlyOutflow)})`,
          link: '/finanzas/flujo-caja',
          at: today
        })
      }

      // Sort newest first
      list.sort((a, b) => String(b.at).localeCompare(String(a.at)))
      items.value = list
    } catch (e) {
      console.error('useNotifications error', e)
    } finally {
      loading.value = false
    }
  }

  return { items, loading, unreadCount, readIds, generate, markAsRead, markAllRead }
}

function currency(v) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v || 0)
}
