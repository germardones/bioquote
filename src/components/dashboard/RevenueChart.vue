<template>
  <div class="chart-wrap">
    <Line v-if="ready" :data="chartData" :options="chartOptions" />
    <div v-else class="chart-empty">Sin datos suficientes para graficar.</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend,
  LineElement, PointElement, CategoryScale, LinearScale, Filler
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler)

const props = defineProps({
  labels: { type: Array, default: () => [] },
  values: { type: Array, default: () => [] }
})

const ready = computed(() => props.labels.length > 0 && props.values.some(v => v > 0))

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [{
    label: 'Ingresos (CLP)',
    data: props.values,
    borderColor: '#008366',
    backgroundColor: 'rgba(0, 131, 102, 0.15)',
    pointBackgroundColor: '#008366',
    fill: true,
    tension: 0.35,
    borderWidth: 2
  }]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => '$' + Number(ctx.parsed.y).toLocaleString('es-CL')
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (v) => '$' + Number(v).toLocaleString('es-CL')
      }
    }
  }
}))
</script>

<style scoped>
.chart-wrap { position: relative; height: 280px; width: 100%; }
.chart-empty {
  display: flex; align-items: center; justify-content: center;
  height: 100%; color: var(--text-muted); font-style: italic;
}
</style>
