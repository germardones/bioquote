<template>
  <div class="kanban-board">
    <div
      v-for="col in columns"
      :key="col.id"
      class="kanban-col"
      :style="{ '--col-color': col.color }"
      @dragover.prevent="onDragOver(col.id)"
      @dragleave="onDragLeave(col.id)"
      @drop="onDrop(col.id)"
      :class="{ 'drop-target': dragOverCol === col.id }"
    >
      <div class="col-header">
        <span class="col-dot"></span>
        <h4>{{ col.label }}</h4>
        <span class="col-count">{{ groupedProjects[col.id]?.length || 0 }}</span>
      </div>

      <div class="col-body">
        <div
          v-for="p in groupedProjects[col.id] || []"
          :key="p.id"
          class="kanban-card"
          draggable="true"
          @dragstart="onDragStart(p)"
          @dragend="onDragEnd"
          @click="$emit('open', p)"
        >
          <div class="card-top">
            <span class="card-code">{{ p.codigo }}</span>
            <span class="card-date" v-if="p.deadline">📅 {{ formatDate(p.deadline) }}</span>
          </div>
          <div class="card-client">{{ p.client_name }}</div>
          <div class="card-name">{{ p.name }}</div>

          <div class="card-progress" v-if="totalMilestones(p) > 0">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPct(p) + '%' }"></div>
            </div>
            <span class="progress-label">
              {{ doneMilestones(p) }}/{{ totalMilestones(p) }} hitos
            </span>
          </div>

          <div class="card-bottom">
            <div class="card-meta" v-if="p.sales_rep_name">
              <i class="fa-solid fa-user"></i> {{ p.sales_rep_name }}
            </div>
            <div class="card-budget">
              <span class="budget-label">Presup.</span>
              <strong>${{ projectTotal(p).toLocaleString('es-CL') }}</strong>
            </div>
          </div>
          <div class="card-cost" v-if="realCost(p) > 0">
            <span>Costo real:</span>
            <strong :class="{ 'over-budget': realCost(p) > projectTotal(p) }">
              ${{ realCost(p).toLocaleString('es-CL') }}
            </strong>
          </div>
        </div>

        <div v-if="!groupedProjects[col.id]?.length" class="col-empty">
          Sin proyectos
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { KANBAN_COLUMNS } from '../../constants/projectStatus'
import { changeKanbanColumn } from '../../utils/projectLifecycle'

const props = defineProps({
  projects: { type: Array, required: true }
})
const emit = defineEmits(['open', 'moved'])

const columns = KANBAN_COLUMNS
const dragging = ref(null)
const dragOverCol = ref(null)

const groupedProjects = computed(() => {
  const out = Object.fromEntries(columns.map(c => [c.id, []]))
  for (const p of props.projects) {
    const col = p.kanban_column && out[p.kanban_column] ? p.kanban_column : 'Backlog'
    out[col].push(p)
  }
  return out
})

const onDragStart = (p) => { dragging.value = p }
const onDragEnd = () => { dragging.value = null; dragOverCol.value = null }
const onDragOver = (colId) => { dragOverCol.value = colId }
const onDragLeave = (colId) => { if (dragOverCol.value === colId) dragOverCol.value = null }

async function onDrop(colId) {
  const p = dragging.value
  dragOverCol.value = null
  if (!p || p.kanban_column === colId) { dragging.value = null; return }
  try {
    await changeKanbanColumn(p, colId)
    p.kanban_column = colId
    emit('moved', { project: p, to: colId })
  } catch (e) {
    console.error('Kanban move failed', e)
    alert('No se pudo mover la tarjeta.')
  } finally {
    dragging.value = null
  }
}

const projectTotal = (p) => Number(p?.financials?.quoted_price || 0)
const realCost = (p) =>
  (p.execution_items || []).reduce((sum, it) => sum + (Number(it.hours) || 0) * 25000, 0)
const totalMilestones = (p) => (p.milestones || []).length
const doneMilestones = (p) => (p.milestones || []).filter(m => m.done).length
const progressPct = (p) => {
  const t = totalMilestones(p)
  return t === 0 ? 0 : Math.round((doneMilestones(p) / t) * 100)
}
const formatDate = (v) => {
  if (!v) return ''
  const d = v?.toDate ? v.toDate() : new Date(v)
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit' }).format(d)
}
</script>

<style scoped>
.kanban-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(240px, 1fr));
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 1rem;
  scrollbar-width: thin;
}
.kanban-board::-webkit-scrollbar { height: 6px; }
.kanban-board::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }

.kanban-col {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-top: 4px solid var(--col-color);
  border-radius: 10px;
  padding: 0;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04);
  overflow: hidden;
}
.kanban-col.drop-target {
  background: rgba(0, 131, 102, 0.06);
  box-shadow: 0 0 0 2px var(--primary);
}

.col-header {
  display: flex; align-items: center; gap: 10px;
  padding: 0.9rem 1rem 0.75rem;
  background: transparent;
}
.col-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--col-color);
}
.col-header h4 {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
  flex: 1;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.col-count {
  background: var(--col-color);
  color: white;
  padding: 1px 9px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 700;
  min-width: 22px;
  text-align: center;
  line-height: 1.5;
}

.col-body { display: flex; flex-direction: column; gap: 0.6rem; flex: 1; padding: 0.75rem; }
.col-empty { color: var(--text-muted); font-style: italic; text-align: center; padding: 1rem; font-size: 0.85rem; }

.kanban-card {
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--col-color);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: grab;
  transition: all 0.15s;
  display: flex; flex-direction: column; gap: 6px;
}
.kanban-card:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.08); border-color: var(--col-color); }
.kanban-card:active { cursor: grabbing; }

.card-top { display: flex; justify-content: space-between; align-items: center; }
.card-code { font-family: monospace; font-size: 0.72rem; color: var(--text-muted); background: var(--bg-app); padding: 2px 6px; border-radius: 4px; }
.card-date { font-size: 0.75rem; color: var(--text-muted); }
.card-client { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
.card-name { font-size: 0.92rem; font-weight: 700; color: var(--text-main); line-height: 1.2; }

.card-progress { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.progress-bar { flex: 1; height: 6px; background: var(--bg-app); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--col-color); transition: width 0.3s; }
.progress-label { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; }

.card-bottom { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 4px; gap: 8px; }
.card-meta { font-size: 0.72rem; color: var(--text-muted); }
.card-budget { font-size: 0.78rem; text-align: right; }
.budget-label { display: block; color: var(--text-muted); font-size: 0.68rem; text-transform: uppercase; }
.card-budget strong { color: var(--primary); }

.card-cost { font-size: 0.72rem; display: flex; justify-content: space-between; padding-top: 4px; border-top: 1px dashed var(--border-color); color: var(--text-muted); }
.card-cost strong { color: var(--text-main); }
.card-cost strong.over-budget { color: #ef4444; }

@media (max-width: 900px) {
  .kanban-board { grid-template-columns: repeat(4, 220px); }
  .kanban-col { min-height: 280px; }
}
@media (max-width: 640px) {
  .kanban-board { grid-template-columns: repeat(4, 180px); gap: 0.6rem; }
  .kanban-col { min-height: 220px; }
  .col-header { padding: 0.6rem 0.75rem; }
  .col-header h4 { font-size: 0.78rem; }
  .col-body { padding: 0.5rem; }
  .kanban-card { padding: 0.6rem; }
  .card-name { font-size: 0.85rem; }
}
</style>
