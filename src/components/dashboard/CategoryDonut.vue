<template>
  <div class="donut-wrap">
    <Doughnut v-if="ready" :data="chartData" :options="chartOptions" />
    <div v-else class="empty">Sin gastos en el período seleccionado.</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, ArcElement
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, ArcElement)

const props = defineProps({
  /** Array of { label, value, color } */
  segments: { type: Array, default: () => [] }
})

const ready = computed(() => props.segments.some(s => s.value > 0))

const chartData = computed(() => ({
  labels: props.segments.map(s => s.label),
  datasets: [{
    data: props.segments.map(s => s.value),
    backgroundColor: props.segments.map(s => s.color),
    borderColor: 'transparent',
    borderWidth: 2,
    hoverOffset: 8
  }]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: {
      position: 'right',
      labels: { boxWidth: 12, padding: 12 }
    },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const v = Number(ctx.parsed)
          const total = ctx.dataset.data.reduce((s, x) => s + x, 0)
          const pct = total ? Math.round((v / total) * 100) : 0
          return `${ctx.label}: $${v.toLocaleString('es-CL')} (${pct}%)`
        }
      }
    }
  }
}))
</script>

<style scoped>
.donut-wrap { position: relative; height: 280px; width: 100%; }
.empty { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-style: italic; }
</style>
