// Employee / collaborator constants (Fase 3)

export const EMPLOYEE_STATUS = [
  { id: 'Activo',        label: 'Activo',        color: '#22c55e' },
  { id: 'ConLicencia',   label: 'Con licencia',  color: '#f59e0b' },
  { id: 'Desvinculado',  label: 'Desvinculado',  color: '#ef4444' }
]

export const CONTRACT_TYPES = [
  { id: 'Indefinido',   label: 'Indefinido' },
  { id: 'PlazoFijo',    label: 'Plazo fijo' },
  { id: 'Honorarios',   label: 'Honorarios' },
  { id: 'Practica',     label: 'Práctica' },
  { id: 'Freelance',    label: 'Freelance' }
]

export const ABSENCE_TYPES = [
  { id: 'vacaciones',  label: 'Vacaciones',         color: '#3b82f6', icon: 'fa-umbrella-beach' },
  { id: 'licencia',    label: 'Licencia médica',    color: '#ef4444', icon: 'fa-briefcase-medical' },
  { id: 'permiso',     label: 'Permiso',            color: '#8b5cf6', icon: 'fa-clock' },
  { id: 'otro',        label: 'Otro',               color: '#64748b', icon: 'fa-circle' }
]

export const ABSENCE_STATUS = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada'
}

export const statusMeta = (id) => EMPLOYEE_STATUS.find(s => s.id === id) || EMPLOYEE_STATUS[0]
export const absenceMeta = (id) => ABSENCE_TYPES.find(t => t.id === id) || ABSENCE_TYPES[3]

// Derive a 3-state from legacy `active: boolean` if needed
export const normalizedStatus = (worker) => {
  if (worker?.estado) return worker.estado
  return worker?.active === false ? 'Desvinculado' : 'Activo'
}

// Inclusive days between two ISO dates 'YYYY-MM-DD'
export const daysBetween = (start, end) => {
  if (!start || !end) return 0
  const a = new Date(start + 'T00:00:00')
  const b = new Date(end + 'T00:00:00')
  return Math.max(0, Math.round((b - a) / 86400000) + 1)
}
