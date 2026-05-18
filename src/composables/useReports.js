import { ref, computed } from 'vue'
import { db, auth } from '../firebase/firebaseConfig'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { STATUS, ACTIVE_STATUSES, QUOTATION_STATUSES } from '../constants/projectStatus'

/**
 * Aggregates raw collections once, then computes 4 report views.
 * Accepts an optional date range (ISO YYYY-MM-DD) to filter.
 */
export function useReports() {
  const loading = ref(false)
  const projects = ref([])
  const tasks = ref([])
  const workers = ref([])
  const expenses = ref([])
  const fixedExpenses = ref([])

  const rangeFrom = ref('')
  const rangeTo = ref('')

  const inRange = (iso) => {
    if (!iso) return false
    const d = typeof iso === 'string' ? iso.slice(0, 10) : (iso?.toDate ? iso.toDate().toISOString().slice(0, 10) : new Date(iso).toISOString().slice(0, 10))
    if (rangeFrom.value && d < rangeFrom.value) return false
    if (rangeTo.value && d > rangeTo.value) return false
    return true
  }

  async function fetchAll() {
    loading.value = true
    try {
      const user = auth.currentUser
      if (!user) return

      const [pSnap, tSnap, wSnap, eSnap, feSnap] = await Promise.all([
        getDocs(query(collection(db, 'projects'), where('owner_uid', '==', user.uid))),
        getDocs(collection(db, 'tasks')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'workers')).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, 'expenses'), where('ownerUid', '==', user.uid))).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'fixed_expenses')).catch(() => ({ docs: [] }))
      ])
      projects.value = pSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      tasks.value = tSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      workers.value = wSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      expenses.value = eSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      fixedExpenses.value = feSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    } finally {
      loading.value = false
    }
  }

  const projectTotal = (p) => Number(p?.financials?.quoted_price || 0)

  // ===== SALES =====
  const salesReport = computed(() => {
    const filtered = projects.value.filter(p => inRange(p.created_at?.toDate?.() || p.created_at))
    const quotes = filtered.filter(p => QUOTATION_STATUSES.includes(p.status)).length
    const approved = filtered.filter(p => [STATUS.APPROVED, STATUS.EN_CURSO, STATUS.COMPLETED].includes(p.status)).length
    const closeRate = quotes > 0 ? Math.round((approved / quotes) * 100) : 0
    const wonProjects = filtered.filter(p => [STATUS.APPROVED, STATUS.EN_CURSO, STATUS.COMPLETED].includes(p.status))
    const avgTicket = wonProjects.length > 0
      ? Math.round(wonProjects.reduce((s, p) => s + projectTotal(p), 0) / wonProjects.length)
      : 0
    const totalSold = wonProjects.reduce((s, p) => s + projectTotal(p), 0)

    // Per status counts
    const perStatus = {}
    filtered.forEach(p => { perStatus[p.status] = (perStatus[p.status] || 0) + 1 })

    return { quotes, approved, closeRate, avgTicket, totalSold, perStatus, count: filtered.length }
  })

  // ===== FINANCIAL (per month) =====
  const financialReport = computed(() => {
    const months = {}
    // Income from payments
    for (const p of projects.value) {
      for (const pay of (p.payments || [])) {
        if (!inRange(pay.date)) continue
        const k = (pay.date || '').slice(0, 7)
        if (!months[k]) months[k] = { income: 0, expense: 0 }
        months[k].income += Number(pay.amount || 0)
      }
    }
    // Expense per month from `expenses`
    for (const e of expenses.value) {
      if (!inRange(e.date)) continue
      const k = (e.date || '').slice(0, 7)
      if (!months[k]) months[k] = { income: 0, expense: 0 }
      months[k].expense += Number(e.amount || 0)
    }
    // Fixed expenses are recurring monthly — add to each month with any activity
    const fixedMonthly = fixedExpenses.value.reduce((s, e) => s + Number(e.amount || 0), 0)
    Object.keys(months).forEach(k => { months[k].expense += fixedMonthly })

    const rows = Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, m]) => ({
        month,
        income: m.income,
        expense: m.expense,
        margin: m.income - m.expense,
        marginPct: m.income > 0 ? Math.round(((m.income - m.expense) / m.income) * 100) : 0
      }))
    const totals = rows.reduce((acc, r) => ({
      income: acc.income + r.income,
      expense: acc.expense + r.expense,
      margin: acc.margin + r.margin
    }), { income: 0, expense: 0, margin: 0 })

    return { rows, totals }
  })

  // ===== PROJECTS =====
  const projectsReport = computed(() => {
    const filtered = projects.value.filter(p => inRange(p.created_at?.toDate?.() || p.created_at))

    // Per status
    const perStatus = {}
    filtered.forEach(p => { perStatus[p.status] = (perStatus[p.status] || 0) + 1 })

    // Average delivery time (Completed projects): created → completed (best-effort using updated_at if completed_at missing)
    const completed = filtered.filter(p => p.status === STATUS.COMPLETED)
    let avgDeliveryDays = 0
    if (completed.length > 0) {
      let sum = 0
      let n = 0
      for (const p of completed) {
        const start = p.created_at?.toDate?.() || (p.created_at ? new Date(p.created_at) : null)
        const end = (p.completed_at?.toDate?.() || p.updated_at?.toDate?.() || null)
        if (start && end) {
          sum += Math.round((end.getTime() - start.getTime()) / 86400000)
          n++
        }
      }
      if (n > 0) avgDeliveryDays = Math.round(sum / n)
    }

    // Real cost vs budget per active/completed project
    const rows = filtered
      .filter(p => ACTIVE_STATUSES.includes(p.status))
      .map(p => {
        const budget = projectTotal(p)
        const realCost = (p.execution_items || []).reduce((s, it) => s + (Number(it.hours) || 0) * 25000, 0)
        return {
          id: p.id,
          name: p.name,
          client: p.client_name,
          status: p.status,
          budget,
          realCost,
          diff: budget - realCost,
          overBudget: realCost > budget
        }
      })
      .sort((a, b) => b.budget - a.budget)

    return { perStatus, avgDeliveryDays, rows, count: filtered.length, completedCount: completed.length }
  })

  // ===== TEAM =====
  const teamReport = computed(() => {
    const rows = workers.value.map(w => {
      const assignedProjects = projects.value.filter(p =>
        (p.assignedWorkerIds || []).includes(w.id) &&
        ACTIVE_STATUSES.includes(p.status)
      )
      const totalProjects = projects.value.filter(p => (p.assignedWorkerIds || []).includes(w.id)).length
      const activeTasks = tasks.value.filter(t => t.assignedTo === w.id && t.status !== 'Completada').length
      const completedTasks = tasks.value.filter(t => t.assignedTo === w.id && t.status === 'Completada').length
      const executionHours = projects.value
        .reduce((sum, p) => sum + (p.execution_items || [])
          .filter(it => it.workerId === w.id)
          .reduce((s, it) => s + Number(it.hours || 0), 0), 0)
      return {
        id: w.id,
        name: w.name,
        role: w.role || '—',
        activeProjects: assignedProjects.length,
        totalProjects,
        activeTasks,
        completedTasks,
        executionHours
      }
    }).sort((a, b) => b.activeProjects - a.activeProjects)
    return { rows }
  })

  return {
    loading, projects, tasks, workers, expenses, fixedExpenses,
    rangeFrom, rangeTo,
    fetchAll,
    salesReport, financialReport, projectsReport, teamReport
  }
}
