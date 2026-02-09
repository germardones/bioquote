<template>
  <div class="followup-view">
    <div class="header">
        
        <h1>Matriz de Seguimiento</h1>
        <button @click="router.back()" class="btn-volver">
          Volver
        </button>
    </div>

    <div v-if="loading" class="loading">Cargando Lead Matrix...</div>
    
    <div v-else class="matrix-container">
        <!-- Optional Filters could go here -->
        
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Etapa Actual</th>
                        <th>Inicio Lead</th>
                        <th>Días Activo</th>
                        <th>Última Acción</th>
                        <th>Estado Matriz</th>
                        <th>Acción Sugerida</th>
                        <th>Link</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="lead in processedLeads" :key="lead.rut">
                        <td data-label="Cliente">
                            <div class="client-info">
                                <span class="tk-name">{{ lead.nombre }}</span>
                                <span class="tk-rut">{{ lead.rut }}</span>
                            </div>
                        </td>
                        <td data-label="Etapa Actual">
                            <span class="stage-badge" :class="lead.pipeline_stage">
                                {{ getStageLabel(lead.pipeline_stage) }}
                            </span>
                        </td>
                        <td data-label="Inicio Lead">{{ formatDate(lead.lead_start_date) }}</td>
                        <td data-label="Días Activo">
                            <span class="days-count">{{ lead.daysActive }} días</span>
                        </td>
                        <td data-label="Última Acción">
                            <div v-if="lead.last_interaction_date">
                                {{ formatDate(lead.last_interaction_date) }}
                                <span class="ago">({{ lead.daysSinceAction }}d atrás)</span>
                            </div>
                            <span v-else class="text-muted">Sin historial</span>
                        </td>
                        <td data-label="Estado Matriz">
                            <span class="status-indicator" :class="lead.matrixStatus.color">
                                <i :class="lead.matrixStatus.icon"></i> {{ lead.matrixStatus.text }}
                            </span>
                        </td>
                        <td data-label="Acción Sugerida">
                            <span class="action-hint">{{ lead.matrixStatus.action }}</span>
                        </td>
                        <td data-label="Link">
                            <button class="btn-go" @click="goToClient(lead.rut)">
                                <i class="fa-solid fa-arrow-right"></i>
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../../firebase/firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'
import { useSettings } from '../../composables/useSettings'

const router = useRouter()
const loading = ref(true)
const leads = ref([])

onMounted(async () => {
    try {
        await fetchSettings() // Fetch dynamic rules first
        const snap = await getDocs(collection(db, 'projects'))
        leads.value = processLeads(snap.docs)
    } catch (e) {
        console.error("Error loading leads:", e)
    } finally {
        loading.value = false
    }
})

const formatDate = (isoStr) => {
    if (!isoStr) return '-'
    // If it's a timestamp object (unlikely if we save as ISO string, but just in case)
    if (typeof isoStr === 'object' && isoStr.seconds) return new Date(isoStr.toDate()).toLocaleDateString('es-CL')
    return new Date(isoStr).toLocaleDateString('es-CL')
}

const getStageLabel = (stage) => {
    const map = {
        lead: 'Identificado',
        contact: 'Primer Contacto',
        followup: 'En Seguimiento',
        meeting: 'Reunión/Demo',
        proposal: 'Propuesta',
        closed_won: 'Ganado',
        closed_lost: 'Perdido'
    }
    return map[stage] || stage
}

const { settings, fetchSettings } = useSettings()

// Matrix Logic - Dynamic
const calculateMatrixStatus = (lead) => {
    const days = lead.daysActive
    const actionDays = lead.daysSinceAction
    const stage = lead.pipeline_stage

    // Si ya está cerrado, no aplica matriz
    if (stage === 'closed_won' || stage === 'closed_lost') {
        return { color: 'neutral', icon: 'fa-regular fa-circle-check', text: 'Cerrado', action: '-' }
    }

    // Sort matrix rules by days ascending to check thresholds
    // Logic Assumption: We check from lowest day threshold up.
    // Actually, usually we check ranges. Let's assume the rules define the "Trigger Point".
    // Example: Day 1 (Contact), Day 4 (Followup 1).
    // If days < 1, nothing? Or assume first rule applies immediately?
    
    // Let's implement a "Current Stage" logic based on days active.
    // Find the rule that currently applies (the highest day threshold surpassed or equaled)
    // Or better: Use the rules to define "Deadlines".
    
    const rules = settings.value.matrix || []
    // Sort logic just in case
    rules.sort((a,b) => a.days - b.days)
    
    // Default state if very new
    let status = { color: 'success', icon: 'fa-solid fa-check', text: 'Al día', action: 'Esperar' }

    // Find applicable rule for current age
    // We look for the rule where days >= rule.days. The "Next rule" dictates the limit.
    // Actually, the matrix usually says: "By day X, you should have done Y".
    // So if days >= rule.days, we check if action was done RECENTLY?
    // Or simpler: The matrix defines CHECKPOINTS.
    
    // Let's try to match the provided logic structure:
    // Day 1: Contacto. logic: if days <= 1.
    // Day 4: Seguimiento 1. logic: if days >= 4 && days < 9 (next rule).
    
    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i]
        const nextRule = rules[i+1]
        
        // Define range for this rule
        const startDay = rule.days
        const endDay = nextRule ? nextRule.days : 9999
        
        // Special case for first rule "Day 1" which usually means Day 0-1
        // If the first rule is Day 1, we treat it as "Up to Day 1".
        // But the loop logic says "startDay".
        
        // LET'S ADAPT: logic sets status based on which "Bucket" the lead falls into.
        if (days >= startDay && days < endDay) {
            // We are in this rule's territory.
            
            // Special Handle for "Day 1" type rules where we want to catch them early
            if (i === 0 && startDay <= 1 && days <= startDay) {
                 if (stage === 'lead') {
                     return { color: rule.color, icon: rule.icon || 'fa-solid fa-bell', text: rule.days + 'd Limit', action: rule.action }
                 }
                 return { color: 'success', icon: 'fa-solid fa-check', text: 'Al día', action: 'Esperar día ' + (nextRule?.days || 'fin') }
            }
            
            // For subsequent rules (Day 4+)
            // Check if action is recent enough?
            // "Al día" logic: if we are in this bucket, we are "Al día" unless we are overdue for THIS bucket's action?
            // The original logic was: "If days >= 4, check validation".
            // Actually, the logic is: If you are in Day 4-9 bucket, you SHOULD have touched it recently?
            // Or just: "It's Day 4, do X".
            
            // Let's us simple "Stale" logic: if daysSinceAction > (something), alert.
            // Assumption: You should have acted when entering this bucket?
            // Let's approximate: If daysSinceAction > (days - startDay + tolerance), or just strict.
            
            // Original: Day 4-9. If actionDays > 3 -> Alert.
            // This implies: If you haven't acted in 3 days, trigger rule action.
            
            const tolerance = 3 // Standardize tolerance? Or make it rule based? for now fixed.
            
            if (actionDays > tolerance) {
                return { color: rule.color, icon: rule.icon, text: 'Día ' + rule.days + '+', action: rule.action }
            } else {
                 return { color: 'success', icon: 'fa-solid fa-check', text: 'Al día', action: 'Esperar día ' + (nextRule?.days || 'fin') }
            }
        }
    }
    
    // If newer than first rule (e.g. Day 0 and rule starts at 1)
    if (rules.length > 0 && days < rules[0].days) {
         return { color: 'success', icon: 'fa-solid fa-check', text: 'Al día', action: 'Esperar día ' + rules[0].days }
    }

    return { color: 'neutral', text: 'N/A', action: '-' }
}

const processLeads = (docs) => {
    const uniqueClients = new Map()
    const now = new Date()

    docs.forEach(d => {
        const p = d.data()
        const cData = p.client_data || {}
        
        // Only process if we have a rut or some ID
        const rut = cData.rut || p.cliente?.rut || p.client_name
        if (!rut) return

        if (!uniqueClients.has(rut)) {
            // Determine Start Date
            let start = cData.lead_start_date 
            if (!start) {
                // Fallback to project creation if available
                start = p.created_at ? (p.created_at.toDate ? p.created_at.toDate().toISOString() : p.created_at) : new Date().toISOString()
            }
            
            // Determine Last Action
            const last = cData.last_interaction_date || null

            // Calc days
            const startDate = new Date(start)
            const diffTime = Math.abs(now - startDate)
            const daysActive = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
            
            let daysSinceAction = 0
            if (last) {
                const lastDate = new Date(last)
                const diffAction = Math.abs(now - lastDate)
                daysSinceAction = Math.floor(diffAction / (1000 * 60 * 60 * 24))
            } else {
                daysSinceAction = daysActive // No action ever? treat as active since start
            }

            uniqueClients.set(rut, {
                rut,
                nombre: cData.nombre || p.client_name || 'Desconocido',
                pipeline_stage: cData.pipeline_stage || 'lead', // default
                lead_start_date: start,
                last_interaction_date: last,
                daysActive,
                daysSinceAction
            })
        }
    })

    return Array.from(uniqueClients.values())
        .map(l => ({ ...l, matrixStatus: calculateMatrixStatus(l) }))
        .sort((a,b) => b.daysActive - a.daysActive) // Oldest first? or sorting by danger? Let's sort by days active desc
}

onMounted(async () => {
    try {
        const snap = await getDocs(collection(db, 'projects'))
        leads.value = processLeads(snap.docs)
    } catch (e) {
        console.error("Error loading leads:", e)
    } finally {
        loading.value = false
    }
})

const processedLeads = computed(() => leads.value)

const goToClient = (rut) => {
    router.push({ name: 'CRMClientDetail', params: { rut } })
}

</script>

<style scoped>
.followup-view {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
}

.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.btn-back {
    background: none; border: none; cursor: pointer; color: var(--text-muted);
    font-size: 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;
}
.subtitle { color: var(--text-muted); margin-top: 0.5rem; }

.table-responsive {
    overflow-x: auto;
    background: var(--bg-surface);
    border-radius: 12px;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
}

table {
    width: 100%;
    border-collapse: collapse;
}

th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-main);
}

th {
    background: var(--bg-app);
    font-weight: 600;
    color: var(--text-muted);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.client-info { display: flex; flex-direction: column; }
.tk-name { font-weight: bold; font-size: 0.95rem; }
.tk-rut { font-size: 0.8rem; color: var(--text-muted); }

.days-count { font-weight: bold; font-family: monospace; }
.ago { font-size: 0.8rem; color: var(--text-muted); margin-left: 4px; }

.stage-badge {
    padding: 4px 10px; border-radius: 20px;
    font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
}
.stage-badge.lead { background: #e0f2fe; color: #0284c7; }
.stage-badge.contact { background: #f3e8ff; color: #7e22ce; }
.stage-badge.followup { background: #ffedd5; color: #c2410c; }
.stage-badge.meeting { background: #fefce8; color: #ca8a04; }
.stage-badge.proposal { background: #dbeafe; color: #1e40af; }
.stage-badge.closed_won { background: #dcfce7; color: #16a34a; }
.stage-badge.closed_lost { background: #f1f5f9; color: #64748b; }

.status-indicator {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 12px; border-radius: 8px; font-weight: bold; font-size: 0.9rem;
}
.status-indicator.success { background: #dcfce7; color: #16a34a; }
.status-indicator.warning { background: #fefce8; color: #ca8a04; }
.status-indicator.danger { background: #fee2e2; color: #dc2626; }
.status-indicator.neutral { background: #f3f4f6; color: #9ca3af; }

.action-hint { font-size: 0.9rem; font-style: italic; }

.btn-go {
    background: var(--primary);
    color: white; border: none; width: 32px; height: 32px;
    border-radius: 50%; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s;
}
.btn-go:hover { transform: translateX(2px); }

@media (max-width: 768px) {
    .followup-view { padding: 1rem; }
    .header { flex-direction: column; align-items: flex-start; gap: 1rem; }
    
    .table-responsive {
        border: none;
        box-shadow: none;
        background: transparent;
        overflow: visible;
    }

    table, thead, tbody, th, td, tr {
        display: block;
        width: 100%;
    }

    thead { display: none; }

    tr {
        margin-bottom: 1rem;
        background: var(--bg-surface);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1rem;
        box-shadow: var(--shadow);
    }

    td {
        border: none;
        padding: 0.5rem 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        text-align: right;
        border-bottom: 1px solid var(--border-color);
    }

    td:last-child { border-bottom: none; }

    td::before {
        content: attr(data-label);
        font-weight: 600;
        color: var(--text-muted);
        font-size: 0.85rem;
        text-align: left;
        margin-right: 1rem;
    }

    .client-info { align-items: flex-end; text-align: right; }
}
</style>
