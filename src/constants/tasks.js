// Internal tasks constants (Fase 4.1)

export const TASK_STATUS = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'EnProgreso',
  COMPLETADA: 'Completada'
}

export const TASK_STATUS_LIST = [
  { id: 'Pendiente',   label: 'Pendiente',    color: '#64748b' },
  { id: 'EnProgreso',  label: 'En Progreso',  color: '#3b82f6' },
  { id: 'Completada',  label: 'Completada',   color: '#22c55e' }
]

export const TASK_PRIORITIES = [
  { id: 'Alta',  label: 'Alta',  color: '#ef4444', icon: 'fa-arrow-up' },
  { id: 'Media', label: 'Media', color: '#f59e0b', icon: 'fa-equals' },
  { id: 'Baja',  label: 'Baja',  color: '#22c55e', icon: 'fa-arrow-down' }
]

export const priorityMeta = (id) => TASK_PRIORITIES.find(p => p.id === id) || TASK_PRIORITIES[1]
export const statusMeta = (id) => TASK_STATUS_LIST.find(s => s.id === id) || TASK_STATUS_LIST[0]
