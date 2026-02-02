import { ref, computed } from 'vue'
import { db, auth } from '../firebase/firebaseConfig'
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, addDoc, deleteDoc } from 'firebase/firestore'

export function useFinancials() {
    const loading = ref(true)
    const kpis = ref({
        totalSold: 0,
        projectCount: 0,
        totalCollected: 0,
        totalPending: 0,
        projectedSales: 0,
        realCost: 0,
        fixedCost: 0
    })

    const detailData = ref({
        sales: [],
        payments: [],
        costs: [],
        margins: [],
        projection: []
    })

    const fixedExpensesList = ref([])
    const workersMap = ref({})

    const fetchFinancialData = async () => {
        try {
            loading.value = true
            const user = auth.currentUser
            if (!user) return

            // Reset
            kpis.value = { totalSold: 0, projectCount: 0, totalCollected: 0, totalPending: 0, projectedSales: 0, realCost: 0, fixedCost: 0 }
            detailData.value = { sales: [], payments: [], costs: [], margins: [], projection: [] }

            // 1. Fetch Workers
            const wSnap = await getDocs(collection(db, 'workers'))
            wSnap.forEach(w => {
                const d = w.data()
                workersMap.value[w.id] = { rate: d.hourlyRate || 0, name: d.name }
            })

            // 2. Fetch Fixed Expenses
            const feSnap = await getDocs(collection(db, 'fixed_expenses'))
            fixedExpensesList.value = feSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            kpis.value.fixedCost = fixedExpensesList.value.reduce((sum, e) => sum + Number(e.amount), 0)

            // 3. Fetch Projects
            const q = query(collection(db, 'projects'), where('owner_uid', '==', user.uid))
            const pSnap = await getDocs(q)
            const projects = pSnap.docs.map(d => ({ id: d.id, ...d.data() }))

            // Logic shared with FinancialDashboard.vue
            const activeProjects = projects.filter(p => ['Approved', 'En Curso', 'Completed'].includes(p.status))
            kpis.value.projectCount = activeProjects.length

            // Calculate Projection (All)
            projects.forEach(p => {
                const total = calculateProjectTotal(p)
                kpis.value.projectedSales += total

                // Projection Detail
                let statusLabel = 'Desconocido'
                let statusClass = 'gray'
                if (p.status === 'Draft') { statusLabel = 'Borrador'; statusClass = 'gray'; }
                else if (p.status === 'Sent') { statusLabel = 'En Negociación'; statusClass = 'orange'; }
                else if (p.status === 'Approved') { statusLabel = 'Aprobado'; statusClass = 'green'; }
                else if (p.status === 'Rejected') { statusLabel = 'Rechazado'; statusClass = 'red'; }
                else if (p.status === 'En Curso') { statusLabel = 'En Ejecución'; statusClass = 'blue'; }
                else if (p.status === 'Completed') { statusLabel = 'Terminado'; statusClass = 'teal'; }

                detailData.value.projection.push({
                    id: p.id,
                    codigo: p.id.substring(0, 8).toUpperCase(),
                    name: p.name,
                    client: p.client_name,
                    status: statusLabel,
                    statusClass: statusClass,
                    date: p.updated_at || p.created_at,
                    total: total
                })
            })

            // Sort Projection
            detailData.value.projection.sort((a, b) => {
                const da = new Date(a.date.seconds ? a.date.toDate() : a.date)
                const db = new Date(b.date.seconds ? b.date.toDate() : b.date)
                return db - da
            })

            // Process Active Projects
            activeProjects.forEach(p => {
                const total = calculateProjectTotal(p)
                p.totalValue = total
                p.codigo = p.id.substring(0, 8).toUpperCase()

                kpis.value.totalSold += total

                // Payments
                const paid = (p.payments || []).reduce((sum, pay) => sum + Number(pay.amount), 0)
                p.paidAmount = paid
                kpis.value.totalCollected += paid

                if (p.payments && Array.isArray(p.payments)) {
                    p.payments.forEach(pay => {
                        detailData.value.payments.push({
                            id: pay.date + Math.random().toString(36).substr(2, 9),
                            projectName: p.name,
                            date: pay.date,
                            note: pay.note,
                            payerName: pay.payerName,
                            paymentMethod: pay.paymentMethod,
                            targetAccount: pay.targetAccount,
                            amount: Number(pay.amount)
                        })
                    })
                }

                // Costs
                if (p.execution_items) {
                    p.execution_items.forEach((i, idx) => {
                        const hours = Number(i.hours) || 0
                        const wData = workersMap.value[i.workerId] || { rate: 0, name: 'Sin Asignar' }
                        const hourlyRate = 25000 // Fixed
                        const cost = hours * hourlyRate

                        kpis.value.realCost += cost
                        p.realProjectCost = (p.realProjectCost || 0) + cost

                        detailData.value.costs.push({
                            id: p.id + '_' + idx,
                            projectName: p.name,
                            itemName: i.name,
                            workerName: wData.name,
                            hours: hours,
                            rate: hourlyRate,
                            total: cost
                        })
                    })
                }

                // Margins
                const margin = p.totalValue - (p.realProjectCost || 0)
                const marginPercent = p.totalValue > 0 ? (margin / p.totalValue) * 100 : 0
                detailData.value.margins.push({
                    id: p.id,
                    codigo: p.codigo,
                    name: p.name,
                    client: p.client_name,
                    totalSold: p.totalValue,
                    realCost: p.realProjectCost || 0,
                    margin: margin,
                    marginPercent: marginPercent
                })
            })

            // Populate other lists
            detailData.value.sales = activeProjects

            kpis.value.totalPending = kpis.value.totalSold - kpis.value.totalCollected

        } catch (e) {
            console.error("Error fetching financials", e)
        } finally {
            loading.value = false
        }
    }

    const calculateProjectTotal = (p) => {
        if (p.financials && p.financials.quoted_price !== undefined) return Number(p.financials.quoted_price)
        if (p.totalValue) return Number(p.totalValue)
        if (p.total) return Number(p.total)
        let sum = 0
        if (p.items && Array.isArray(p.items)) {
            p.items.forEach(i => {
                if (i.pricingMethod === 'fixed') sum += Number(i.fixedValue) || 0
                else sum += (Number(i.hours) * Number(i.rate || 25000))
            })
        }
        return sum
    }

    const formatCurrency = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val || 0)
    const formatDate = (isoStr) => {
        if (!isoStr) return '-'
        const date = new Date(isoStr.seconds ? isoStr.toDate() : isoStr)
        return new Intl.DateTimeFormat('es-CL').format(date)
    }

    return {
        loading,
        kpis,
        detailData,
        fixedExpensesList,
        fetchFinancialData,
        formatCurrency,
        formatDate
    }
}
