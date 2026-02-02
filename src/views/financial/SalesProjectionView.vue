<template>
  <div class="container">
    <div class="header">
      <h2>Control de Proyección Mensual</h2>
      <button @click="router.push('/dashboard')" class="btn-volver">
        <span class="icon">⬅️</span> Volver
      </button>
    </div>

    <div v-if="loading" class="loading">Cargando datos...</div>

    <div v-else>
         <!-- Summary Card -->
        <div class="summary-card orange">
            <div class="card-icon"><i class="fa-solid fa-chart-line"></i></div>
            <div class="info">
                <label>Proyección de Venta</label>
                <span class="value">{{ formatCurrency(kpis.projectedSales) }}</span>
                <small>Total de Cotizaciones</small>
            </div>
        </div>

        <div class="projection-view">
             <div class="projection-filter">
                <span><strong>Control Mensual:</strong> Visualizando todas las propuestas para cierre del mes (25 - 05).</span>
            </div>

            <div class="cash-flow-summary">
                <div class="cf-card income">
                    <label>Aprobado / Ganado</label>
                    <span class="value">{{ formatCurrency(detailData.projection.filter(p=>p.status === 'Aprobado' || p.status === 'Terminado' || p.status === 'En Ejecución').reduce((s,p) => s + p.total, 0)) }}</span>
                </div>
                    <div class="cf-card expense">
                    <label>Rechazado / Perdido</label>
                    <span class="value">{{ formatCurrency(detailData.projection.filter(p=>p.status === 'Rechazado').reduce((s,p) => s + p.total, 0)) }}</span>
                </div>
                <div class="cf-card orange">
                    <label>En Negociación</label>
                    <span class="value">{{ formatCurrency(detailData.projection.filter(p=>p.status === 'En Negociación').reduce((s,p) => s + p.total, 0)) }}</span>
                </div>
            </div>

            <div class="table-responsive">
                    <table class="details-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Código</th>
                                <th>Proyecto</th>
                                <th>Cliente</th>
                                <th>Estado (Control)</th>
                                <th class="text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="p in detailData.projection" :key="p.id">
                                <td>{{ formatDate(p.date) }}</td>
                                <td><span class="code">{{ p.codigo }}</span></td>
                                <td>{{ p.name }}</td>
                                <td>{{ p.client }}</td>
                                <td>
                                    <span class="badge-status" :class="p.statusClass">{{ p.status }}</span>
                                </td>
                                <td class="text-right">{{ formatCurrency(p.total) }}</td>
                            </tr>
                        </tbody>
                    </table>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFinancials } from '../../composables/useFinancials'

const router = useRouter()
const { loading, kpis, detailData, fetchFinancialData, formatCurrency, formatDate } = useFinancials()

onMounted(() => {
    fetchFinancialData()
})
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.summary-card { background: var(--bg-surface); padding: 1.5rem; border-radius: 12px; box-shadow: var(--shadow); display: flex; align-items: center; gap: 1rem; border-left: 5px solid #f97316; margin-bottom: 2rem; border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
.card-icon { font-size: 1.4rem; background: var(--bg-app); color: var(--text-muted); width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 10px; }
.info { display: flex; flex-direction: column; }
.value { font-size: 1.5rem; font-weight: bold; color: var(--text-main); }
.projection-view { background: var(--bg-surface); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: var(--shadow); }
.projection-filter { background: var(--bg-app); padding: 10px; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid var(--border-color); }
.cash-flow-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.cf-card { padding: 1rem; border-radius: 8px; background: var(--bg-app); border: 1px solid var(--border-color); text-align: center; }
.cf-card label { display: block; font-size: 0.9rem; color: var(--text-muted); margin-bottom: 5px; }
.cf-card .value { font-size: 1.2rem; font-weight: bold; color: var(--text-main); }
.cf-card.income .value { color: #22c55e; }
.cf-card.expense .value { color: #ef4444; }

/* Light Theme Defaults (overridden by dark mode below) */
.cf-card.orange { border-color: #ffedd5;}
.cf-card.orange .value { color: #0ca7c2; }
.cf-card.net { background: #eef2ff; border-color: #c7d2fe; }

.details-table { width: 100%; border-collapse: collapse; }
.details-table th, .details-table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border-color); color: var(--text-main); }
.text-right { text-align: right; }
.code { font-family: monospace; background: var(--bg-app); padding: 2px 6px; border-radius: 4px; color: var(--text-muted); }

/* Badge Defaults */
.badge-status { padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
.badge-status.gray { background: #f3f4f6; color: #4b5563; }
.badge-status.orange { background: #ffedd5; color: #9a3412; }
.badge-status.green { background: #dcfce7; color: #166534; }
.badge-status.red { background: #fee2e2; color: #991b1b; }
.badge-status.blue { background: #dbeafe; color: #1e40af; }
.badge-status.teal { background: #ccfbf1; color: #115e59; }

/* Dark Mode Overrides */
:global([data-theme='dark']) .cf-card.orange { 
    background: rgba(249, 115, 22, 0.15); 
    border-color: rgba(249, 115, 22, 0.3); 
}
:global([data-theme='dark']) .cf-card.orange .value { color: #fbbf24; }

:global([data-theme='dark']) .cf-card.net { 
    background: rgba(59, 130, 246, 0.15) !important; 
    border-color: rgba(59, 130, 246, 0.3) !important; 
}
:global([data-theme='dark']) .cf-card.net .value { color: #60a5fa; }

:global([data-theme='dark']) .badge-status.gray { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }
:global([data-theme='dark']) .badge-status.orange { background: rgba(249, 115, 22, 0.15); color: #fbbf24; }
:global([data-theme='dark']) .badge-status.green { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
:global([data-theme='dark']) .badge-status.red { background: rgba(239, 68, 68, 0.15); color: #f87171; }
:global([data-theme='dark']) .badge-status.blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
:global([data-theme='dark']) .badge-status.teal { background: rgba(20, 184, 166, 0.15); color: #2dd4bf; }
</style>
