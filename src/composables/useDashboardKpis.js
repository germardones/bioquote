import { ref } from 'vue'
import { db, auth } from '../firebase/firebaseConfig'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { STATUS, ACTIVE_STATUSES, QUOTATION_STATUSES } from '../constants/projectStatus'

/**
 * Dashboard-level KPIs derived from the `projects` collection.
 * - Monthly comparisons (current vs previous month) for revenue, quotes, expenses.
 * - 6-month revenue series for the chart.
 * - "Recent activity" feed (last N events across quotes, projects, payments).
 *
 * Revenue source: `payments[]` arrays inside `projects` docs. Payment date is `pay.date`
 * (ISO string saved by Step5Summary / project payments view). This avoids any double-count
 * because there is no separate `transactions` collection in this codebase.
 *
 * Expenses source: `fixed_expenses` collection (monthly recurring) until Fase 2 adds
 * a dedicated `expenses` collection — that slot is filled here as a placeholder.
 */
export function useDashboardKpis() {
  const loading = ref(true)

  const kpis = ref({
    revenueThisMonth: 0,
    revenuePrevMonth: 0,
    revenueDelta: 0,           // percentage variation, signed
    activeProjects: 0,
    completedProjects: 0,
    pausedProjects: 0,         // status = Rejected (treated as paused/cancelled quotes)
    quotesThisMonth: 0,
    quotesPending: 0,          // Sent + InNegotiation
    activeClients: 0,
    expensesThisMonth: 0,      // monthly recurring expenses (fixed)
    grossMargin: 0             // revenue - real cost (this month)
  })

  const revenueSeries = ref({
    labels: [],   // ['Dic', 'Ene', ...]
    values: []    // numbers per month
  })

  const recentActivity = ref([])

  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const toDate = (v) => {
    if (!v) return null
    if (typeof v?.toDate === 'function') return v.toDate()
    return new Date(v)
  }
  const projectTotal = (p) => Number(p?.financials?.quoted_price || p?.totalValue || p?.total || 0)

  const fetchDashboardData = async () => {
    try {
      loading.value = true
      const user = auth.currentUser
      if (!user) return

      // --- Projects ---
      const pSnap = await getDocs(
        query(collection(db, 'projects'), where('owner_uid', '==', user.uid))
      )
      const projects = pSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      const now = new Date()
      const thisMonth = monthKey(now)
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonth = monthKey(prevMonthDate)

      // Build the last 6 months keys (oldest -> newest)
      const monthsBack = 6
      const seriesKeys = []
      const seriesLabels = []
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        seriesKeys.push(monthKey(d))
        seriesLabels.push(monthNames[d.getMonth()])
      }
      const seriesMap = Object.fromEntries(seriesKeys.map(k => [k, 0]))

      // Project status counters
      const activeClients = new Set()
      let activeProjects = 0
      let completedProjects = 0
      let pausedProjects = 0
      let quotesThisMonth = 0
      let quotesPending = 0
      let realCostThisMonth = 0

      const activityEvents = []

      for (const p of projects) {
        // Status buckets
        if (p.status === STATUS.EN_CURSO) activeProjects++
        else if (p.status === STATUS.COMPLETED) completedProjects++
        else if (p.status === STATUS.REJECTED) pausedProjects++

        if ([STATUS.SENT, STATUS.IN_NEGOTIATION].includes(p.status)) quotesPending++

        // Quotes created this month (any quotation status)
        const created = toDate(p.created_at)
        if (created && monthKey(created) === thisMonth && QUOTATION_STATUSES.includes(p.status)) {
          quotesThisMonth++
        }

        // Active clients (any project not rejected)
        if (p.status !== STATUS.REJECTED) {
          const key = p.client_data?.rut || p.client_name
          if (key) activeClients.add(key)
        }

        // Revenue from payments[]
        for (const pay of p.payments || []) {
          const d = toDate(pay.date)
          if (!d) continue
          const k = monthKey(d)
          if (k in seriesMap) seriesMap[k] += Number(pay.amount || 0)
          if (k === thisMonth) {
            activityEvents.push({
              type: 'payment',
              at: d,
              title: `Pago recibido — ${p.client_name}`,
              detail: `$${Number(pay.amount || 0).toLocaleString('es-CL')}`,
              link: `/proyectos/${p.id}`
            })
          }
        }

        // Real cost this month (execution items have no date; attribute to current month
        // as an approximation — same logic as useFinancials)
        if (ACTIVE_STATUSES.includes(p.status) && Array.isArray(p.execution_items)) {
          for (const it of p.execution_items) {
            realCostThisMonth += (Number(it.hours) || 0) * 25000
          }
        }

        // Activity: quote created
        if (created) {
          activityEvents.push({
            type: 'quote',
            at: created,
            title: `Cotización creada — ${p.client_name}`,
            detail: `$${projectTotal(p).toLocaleString('es-CL')}`,
            link: `/proyectos/${p.id}`
          })
        }

        // Activity: status history (last 5 entries)
        for (const h of (p.history || []).slice(-5)) {
          const at = h.at ? new Date(h.at) : null
          if (!at) continue
          activityEvents.push({
            type: 'status',
            at,
            title: `${p.client_name}: ${h.from || '—'} → ${h.to}`,
            detail: h.by || '',
            link: `/proyectos/${p.id}`
          })
        }
      }

      // --- Expenses (this month) ---
      // Real operational expenses from `expenses` collection (Fase 2.1)
      // + monthly recurring fixed expenses from `fixed_expenses`.
      let expensesMonthly = 0
      try {
        const eSnap = await getDocs(
          query(collection(db, 'expenses'), where('ownerUid', '==', user.uid))
        )
        eSnap.forEach(d => {
          const data = d.data()
          if ((data.date || '').startsWith(thisMonth)) {
            expensesMonthly += Number(data.amount || 0)
          }
        })
      } catch (_) { /* collection may not exist yet */ }
      try {
        const feSnap = await getDocs(collection(db, 'fixed_expenses'))
        feSnap.forEach(d => { expensesMonthly += Number(d.data().amount || 0) })
      } catch (_) { /* collection may not exist yet */ }

      // Commit
      revenueSeries.value = { labels: seriesLabels, values: seriesKeys.map(k => seriesMap[k]) }

      kpis.value = {
        revenueThisMonth: seriesMap[thisMonth] || 0,
        revenuePrevMonth: seriesMap[prevMonth] || 0,
        revenueDelta: (() => {
          const a = seriesMap[thisMonth] || 0
          const b = seriesMap[prevMonth] || 0
          if (b === 0) return a === 0 ? 0 : 100
          return Math.round(((a - b) / b) * 100)
        })(),
        activeProjects,
        completedProjects,
        pausedProjects,
        quotesThisMonth,
        quotesPending,
        activeClients: activeClients.size,
        expensesThisMonth: expensesMonthly,
        grossMargin: (seriesMap[thisMonth] || 0) - realCostThisMonth - expensesMonthly
      }

      // Sort activity desc, keep top 10
      activityEvents.sort((a, b) => b.at - a.at)
      recentActivity.value = activityEvents.slice(0, 10).map(e => ({
        ...e,
        atLabel: new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(e.at)
      }))
    } catch (e) {
      console.error('useDashboardKpis error', e)
    } finally {
      loading.value = false
    }
  }

  const formatCurrency = (v) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v || 0)

  return { loading, kpis, revenueSeries, recentActivity, fetchDashboardData, formatCurrency }
}
