<template>
  <div class="calendar-container card">
    <div class="calendar-header">
      <div class="month-nav">
        <button @click="changeMonth(-1)" class="nav-btn"><i class="fa-solid fa-chevron-left"></i></button>
        <h3>{{ monthName }} {{ currentYear }}</h3>
        <button @click="changeMonth(1)" class="nav-btn"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div class="legend">
        <span class="legend-item"><span class="dot task"></span> Tareas</span>
        <span class="legend-item"><span class="dot crm"></span> CRM</span>
      </div>
    </div>

    <div class="calendar-grid">
      <div class="weekday" v-for="day in weekdays" :key="day">{{ day }}</div>
      
      <div 
        v-for="(day, index) in calendarDays" 
        :key="index"
        class="day-cell"
        :class="{ 
          'empty': !day.date, 
          'today': isToday(day.date),
          'has-events': day.events.length > 0,
          'selected': isSelected(day.date)
        }"
        @click="selectDay(day)"
      >
        <span v-if="day.date" class="day-number">{{ day.dayNum }}</span>
        <div v-if="day.date" class="events-dots">
           <span v-for="(evt, i) in day.events.slice(0, 4)" :key="i" class="event-dot" :class="evt.type"></span>
           <span v-if="day.events.length > 4" class="event-plus">+</span>
        </div>
      </div>
    </div>

    <!-- Details View for Selected Day -->
    <div v-if="selectedDay" class="day-details fade-in">
        <div class="details-header">
            <h4>Eventos del {{ formatDate(selectedDay.date) }}</h4>
            <button class="close-btn" @click="selectedDay = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        
        <div v-if="selectedDay.events.length === 0" class="no-events">
            No hay actividades programadas para este día.
        </div>

        <div v-else class="events-list">
            <div v-for="(evt, idx) in selectedDay.events" :key="idx" class="event-card" :class="evt.type">
                <div class="event-icon">
                    <i v-if="evt.type === 'task'" class="fa-solid fa-list-check"></i>
                    <i v-else class="fa-solid fa-address-book"></i>
                </div>
                <div class="event-info">
                    <span class="evt-title">{{ evt.title }}</span>
                    <span class="evt-desc">{{ evt.desc }}</span>
                    <span class="evt-meta" v-if="evt.meta">{{ evt.meta }}</span>
                </div>
                <button v-if="evt.link" class="btn-go" @click="router.push(evt.link)">
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        </div>
    </div>

  </div>
</template>

<script setup>
import { ref,computed, onMounted } from 'vue'
import { db } from '../../firebase/firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentDate = ref(new Date())
const selectedDay = ref(null)
const rawEvents = ref([])
const loading = ref(false)

const weekdays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

const monthName = computed(() => {
    return currentDate.value.toLocaleString('es-CL', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())
})

const currentYear = computed(() => currentDate.value.getFullYear())

onMounted(() => {
    fetchEvents()
})

const fetchEvents = async () => {
    loading.value = true
    rawEvents.value = []
    try {
        // 1. Fetch CRM Interactions
        const crmSnap = await getDocs(collection(db, 'crm_interactions'))
        const crmEvents = crmSnap.docs.map(d => {
            const data = d.data()
            // Support both Timestamp and string dates
            let dateObj = null
            if (data.date && data.date.toDate) dateObj = data.date.toDate()
            else if (data.date) dateObj = new Date(data.date)
            
            if (!dateObj) return null

            return {
                date: dateObj,
                type: 'crm',
                title: data.type ? data.type.toUpperCase() : 'INTERACCIÓN',
                desc: data.summary,
                meta: 'Cliente: ' + (data.clientRut || 'N/D'),
                link: `/crm/cliente/${data.clientRut}` // Assuming route exists
            }
        }).filter(e => e !== null)
        
        // 2. Fetch Project Tasks (Execution Items)
        const projSnap = await getDocs(collection(db, 'projects'))
        const taskEvents = []
        
        projSnap.forEach(doc => {
            const p = doc.data()
            if (p.execution_items && Array.isArray(p.execution_items)) {
                p.execution_items.forEach(item => {
                    const exec = item.execution
                    if (exec && (exec.startDate || exec.endDate)) {
                        /* 
                           We could show range, but for simplicity let's show:
                           - Start Date: "Inicio: Tarea X"
                           - End Date: "Fin: Tarea X"
                           Or just the End Date (deadline)
                        */
                        
                        // Option A: Just End Date/Deadline
                        if (exec.endDate) {
                            taskEvents.push({
                                date: new Date(exec.endDate),
                                type: 'task',
                                title: 'ENTREGA: ' + item.description,
                                desc: `Proyecto: ${p.name}`,
                                meta: `Avance: ${exec.progress}%`,
                                link: `/proyectos-en-curso/${doc.id}`
                            })
                        }
                        
                        // Option B: Start Date too
                        if (exec.startDate) {
                            taskEvents.push({
                                date: new Date(exec.startDate),
                                type: 'task',
                                title: 'INICIO: ' + item.description,
                                desc: `Proyecto: ${p.name}`,
                                meta: `Responsable: ${exec.workerId || 'N/A'}`,
                                link: `/proyectos-en-curso/${doc.id}`
                            })
                        }
                    }
                })
            }
        })

        rawEvents.value = [...crmEvents, ...taskEvents]

    } catch (e) {
        console.error("Error fetching calendar events:", e)
    } finally {
        loading.value = false
    }
}

const changeMonth = (delta) => {
    const d = new Date(currentDate.value)
    d.setMonth(d.getMonth() + delta)
    currentDate.value = d
    selectedDay.value = null // clear selection on change
}

const calendarDays = computed(() => {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    // Day of week of the 1st (0-6)
    const startDay = firstDayOfMonth.getDay() 
    
    const days = []
    
    // Empty cells before 1st
    for (let i = 0; i < startDay; i++) {
        days.push({ date: null })
    }
    
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i)
        // Filter events for this day
        const dayEvents = rawEvents.value.filter(e => {
            // Compare YYYY-MM-DD
            return e.date.getDate() === i && 
                   e.date.getMonth() === month && 
                   e.date.getFullYear() === year
        })
        
        days.push({
            date: d,
            dayNum: i,
            events: dayEvents
        })
    }
    
    return days
})

const isToday = (date) => {
    const today = new Date()
    return date && 
           date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
}

const isSelected = (date) => {
    return selectedDay.value && selectedDay.value.date && 
           date.getTime() === selectedDay.value.date.getTime()
}

const selectDay = (day) => {
    if (!day.date) return
    selectedDay.value = day
}

const formatDate = (date) => {
    return date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
}
</script>

<style scoped>
.calendar-container {
    background: var(--bg-surface);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
}

.calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.month-nav {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.nav-btn {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: 50%;
    width: 32px; height: 32px;
    cursor: pointer;
    color: var(--text-main);
    display: flex; align-items: center; justify-content: center;
}
.nav-btn:hover { background: var(--bg-app); color: var(--primary); border-color: var(--primary); }

.calendar-header h3 { margin: 0; font-size: 1.2rem; text-transform: capitalize; color: var(--text-main); }

.legend { display: flex; gap: 1rem; font-size: 0.85rem; color: var(--text-muted); }
.legend-item { display: flex; align-items: center; gap: 6px; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dot.task { background: #3b82f6; }
.dot.crm { background: #8b5cf6; }

/* Grid */
.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
}

.weekday {
    text-align: center;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-muted);
    padding-bottom: 0.5rem;
}

.day-cell {
    aspect-ratio: 1/1;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    transition: all 0.2s;
    background: var(--bg-app);
}

.day-cell.empty { background: transparent; border: none; cursor: default; }

.day-cell:not(.empty):hover { border-color: var(--primary); transform: translateY(-2px); }

.day-cell.selected { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.1); }

.day-cell.today { border: 2px solid var(--primary); font-weight: bold; }

.day-number { font-size: 0.85rem; color: var(--text-main); margin-bottom: 4px; }

.events-dots { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px; }
.event-dot { width: 6px; height: 6px; border-radius: 50%; }
.event-dot.task { background: #3b82f6; }
.event-dot.crm { background: #8b5cf6; }
.event-plus { font-size: 0.6rem; color: var(--text-muted); line-height: 1; }


/* Details Panel */
.day-details {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color);
    animation: fadeIn 0.3s;
}

.details-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.details-header h4 { margin: 0; font-size: 1.1rem; text-transform: capitalize; }
.close-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 1.1rem; }

.events-list { display: flex; flex-direction: column; gap: 0.8rem; }

.event-card {
    display: flex; align-items: center; gap: 1rem;
    background: var(--bg-app);
    padding: 0.8rem;
    border-radius: 8px;
    border-left: 4px solid #ccc;
}

.event-card.task { border-left-color: #3b82f6; }
.event-card.task .event-icon { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }

.event-card.crm { border-left-color: #8b5cf6; }
.event-card.crm .event-icon { color: #8b5cf6; background: rgba(139, 92, 246, 0.1); }

.event-icon { 
    width: 36px; height: 36px; 
    border-radius: 50%; 
    display: flex; justify-content: center; align-items: center; 
    font-size: 1rem; 
}

.event-info { flex: 1; display: flex; flex-direction: column; }
.evt-title { font-weight: 700; font-size: 0.9rem; color: var(--text-main); }
.evt-desc { font-size: 0.85rem; color: var(--text-muted); }
.evt-meta { font-size: 0.75rem; color: var(--text-muted); font-style: italic; margin-top: 2px; }

.btn-go {
    background: none; border: none; cursor: pointer; 
    color: var(--text-muted); 
    width: 30px; height: 30px; border-radius: 50%;
    display: flex; justify-content: center; align-items: center;
    transition: background 0.2s;
}
.btn-go:hover { background: rgba(0,0,0,0.05); color: var(--primary); }

.no-events { text-align: center; font-style: italic; color: var(--text-muted); padding: 1rem; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

@media (max-width: 640px) {
    .calendar-grid { gap: 4px; }
    .day-cell { height: 50px; aspect-ratio: auto; }
}
</style>
