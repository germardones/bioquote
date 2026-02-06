<template>
  <div class="container">
    <div class="header">
      <h2>Detalle de Costos Operativos</h2>
      <button @click="router.push('/dashboard')" class="btn-volver">
         Volver
      </button>
    </div>

    <div v-if="loading" class="loading">Cargando datos...</div>

    <div v-else>
         <!-- Summary Card -->
        <div class="summary-card purple">
            <div class="card-icon"><i class="fa-solid fa-helmet-safety"></i></div>
            <div class="info">
                <label>Costo Real (Operativo)</label>
                <span class="value">{{ formatCurrency(kpis.realCost) }}</span>
                <small>Horas asignadas x Tarifa Worker</small>
            </div>
        </div>

        <div class="table-responsive">
            <table class="details-table">
                <thead>
                    <tr>
                        <th>Proyecto</th>
                        <th>Item</th>
                        <th>Usuario</th>
                        <th class="text-right">Horas</th>
                        <th class="text-right">Tarifa</th>
                        <th class="text-right">Costo Total</th>
                    </tr>
                </thead>
                    <tbody>
                    <tr v-for="cost in detailData.costs" :key="cost.id">
                        <td>{{ cost.projectName }}</td>
                        <td data-label="Item">{{ cost.itemName }}</td>
                        <td data-label="Usuario">{{ cost.workerName }}</td>
                        <td class="text-right" data-label="Horas">{{ cost.hours }}h</td>
                        <td class="text-right" data-label="Tarifa">{{ formatCurrency(cost.rate) }}</td>
                        <td class="text-right" data-label="Costo Total">{{ formatCurrency(cost.total) }}</td>
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
.summary-card { background: var(--bg-surface); padding: 1.5rem; border-radius: 12px; box-shadow: var(--shadow); display: flex; align-items: center; gap: 1rem; border-left: 5px solid #a855f7; margin-bottom: 2rem; border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
.card-icon { font-size: 1.4rem; background: var(--bg-app); color: var(--text-muted); width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 10px; }
.info { display: flex; flex-direction: column; }
.value { font-size: 1.5rem; font-weight: bold; color: var(--text-main); }
.info label { color: var(--text-muted); font-size: 0.9rem; }
.table-responsive { overflow-x: auto; background: var(--bg-surface); border-radius: 12px; padding: 1rem; box-shadow: var(--shadow); border: 1px solid var(--border-color); }
.details-table { width: 100%; border-collapse: collapse; }
.details-table th { background: var(--bg-app); color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; padding: 12px; text-align: left; }
.details-table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border-color); color: var(--text-main); }
.text-right { text-align: right; }

@media (max-width: 640px) {
  .container { padding: 1rem; }
  
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
  
  /* Table to Cards */
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
      font-weight: bold;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
  }

  .details-table td:before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--text-muted);
    font-size: 0.85rem;
    text-align: left;
  }
  
  .details-table td:first-child:before { display: none; }
}
</style>
