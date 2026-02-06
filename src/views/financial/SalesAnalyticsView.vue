<template>
  <div class="container">
    <div class="header">
      <h2>Rentabilidad por Proyecto</h2>
      <button @click="router.push('/dashboard')" class="btn-volver">
        Volver
      </button>
    </div>

    <div v-if="loading" class="loading">Cargando datos...</div>

    <div v-else>
        <!-- Summary Card -->
        <div class="summary-card blue">
            <div class="card-icon"><i class="fa-solid fa-chart-line"></i></div>
            <div class="info">
                <label>Total Vendido</label>
                <span class="value">{{ formatCurrency(kpis.totalSold) }}</span>
                <small>{{ kpis.projectCount }} Proyectos aprobados</small>
            </div>
        </div>

        <div class="table-responsive">
            <table class="details-table">
                <thead>
                    <tr>
                        <th>Proyecto</th>
                        <th>Cliente</th>
                        <th class="text-right">Venta Total</th>
                        <th class="text-right">Costo Real</th>
                        <th class="text-right">Margen $</th>
                        <th class="text-right">Rentabilidad %</th>
                    </tr>
                </thead>
                <tbody>
                        <tr v-for="m in detailData.margins" :key="m.id">
                        <td>
                            <div><strong>{{ m.name }}</strong></div>
                            <small class="code">{{ m.codigo }}</small>
                        </td>
                        <td>{{ m.client }}</td>
                        <td class="text-right">{{ formatCurrency(m.totalSold) }}</td>
                        <td class="text-right text-red">{{ formatCurrency(m.realCost) }}</td>
                        <td class="text-right font-bold" :class="{ 'text-green': m.margin > 0, 'text-red': m.margin < 0 }">
                            {{ formatCurrency(m.margin) }}
                        </td>
                        <td class="text-right">
                            <span class="badge" :class="{ 'bg-green': m.marginPercent > 30, 'bg-orange': m.marginPercent <= 30 && m.marginPercent > 10, 'bg-red': m.marginPercent <= 10 }">
                                {{ Math.round(m.marginPercent) }}%
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFinancials } from '../../composables/useFinancials'

const router = useRouter()
const { loading, kpis, detailData, fetchFinancialData, formatCurrency } = useFinancials()

onMounted(() => {
    fetchFinancialData()
})
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.summary-card { background: var(--bg-surface); padding: 1.5rem; border-radius: 12px; box-shadow: var(--shadow); display: flex; align-items: center; gap: 1rem; border-left: 5px solid #3b82f6; margin-bottom: 2rem; border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
.card-icon { font-size: 1.4rem; background: var(--bg-app); color: var(--text-muted); width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 10px; }
.info { display: flex; flex-direction: column; }
.value { font-size: 1.5rem; font-weight: bold; color: var(--text-main); }
.info label { color: var(--text-muted); font-size: 0.9rem; }
.table-responsive { overflow-x: auto; background: var(--bg-surface); border-radius: 12px; padding: 1rem; box-shadow: var(--shadow); border: 1px solid var(--border-color); }
.details-table { width: 100%; border-collapse: collapse; }
.details-table th { background: var(--bg-app); color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; padding: 12px; text-align: left; }
.details-table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border-color); color: var(--text-main); }
.text-right { text-align: right; }
.text-red { color: #dc2626; }
.text-green { color: #16a34a; }
.font-bold { font-weight: bold; }
.bg-green { background: #dcfce7; color: #166534; }
.bg-orange { background: #ffedd5; color: #9a3412; }
.bg-red { background: #fee2e2; color: #991b1b; }
.code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
.badge { padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; }

@media (max-width: 640px) {
  .container {
    padding: 1rem;
  }
  
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .summary-card {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }

  .details-table, .details-table thead, .details-table tbody, .details-table th, .details-table td, .details-table tr {
    display: block;
    width: 100%;
  }

  .details-table thead { display: none; }

  .details-table tr {
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem;
    background: var(--bg-surface);
  }

  .details-table td {
    border: none;
    padding: 0.5rem 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: right;
  }
  
  .details-table td:first-child {
      display: block;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
  }

  .details-table td:before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--text-muted);
    font-size: 0.85rem;
    text-transform: uppercase;
    text-align: left;
  }
  
  .details-table td:first-child:before { display: none; }
}
</style>
