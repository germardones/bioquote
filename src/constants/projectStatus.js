// Centralised status definitions for projects/quotations.
// Internal values stay in English to keep compatibility with existing Firestore docs.
// Labels are Spanish for the UI.

export const STATUS = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  IN_NEGOTIATION: 'InNegotiation',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EN_CURSO: 'En Curso',
  COMPLETED: 'Completed'
}

// Status that belong to the quotation lifecycle (shown in /cotizaciones)
export const QUOTATION_STATUSES = [
  STATUS.DRAFT,
  STATUS.SENT,
  STATUS.IN_NEGOTIATION,
  STATUS.APPROVED,
  STATUS.REJECTED
]

// Status that belong to the active-project lifecycle (shown in /proyectos-en-curso)
export const ACTIVE_STATUSES = [STATUS.EN_CURSO, STATUS.COMPLETED]

export const STATUS_META = {
  [STATUS.DRAFT]:          { label: 'Borrador',       color: '#38bdf8', cssClass: 'draft' },
  [STATUS.SENT]:           { label: 'Enviada',        color: '#fbbf24', cssClass: 'sent' },
  [STATUS.IN_NEGOTIATION]: { label: 'En Negociación', color: '#a855f7', cssClass: 'in-negotiation' },
  [STATUS.APPROVED]:       { label: 'Aprobada',       color: '#4ade80', cssClass: 'approved' },
  [STATUS.REJECTED]:       { label: 'Rechazada',      color: '#f87171', cssClass: 'rejected' },
  [STATUS.EN_CURSO]:       { label: 'En Curso',       color: '#22c55e', cssClass: 'en-curso' },
  [STATUS.COMPLETED]:      { label: 'Completado',     color: '#60a5fa', cssClass: 'completed' }
}

export const statusLabel = (s) => STATUS_META[s]?.label || s || '—'
export const statusCssClass = (s) => STATUS_META[s]?.cssClass || ''

// Kanban columns for projects in execution (En Curso)
export const KANBAN_COLUMNS = [
  { id: 'Backlog',      label: 'Backlog',      color: '#94a3b8' },
  { id: 'EnProgreso',   label: 'En Progreso',  color: '#3b82f6' },
  { id: 'EnRevision',   label: 'En Revisión',  color: '#f59e0b' },
  { id: 'Completado',   label: 'Completado',   color: '#22c55e' }
]

// Allowed forward transitions for the quotation/project lifecycle.
// Used to render action buttons in the UI.
export const NEXT_TRANSITIONS = {
  [STATUS.DRAFT]:          [STATUS.SENT, STATUS.REJECTED],
  [STATUS.SENT]:           [STATUS.IN_NEGOTIATION, STATUS.APPROVED, STATUS.REJECTED],
  [STATUS.IN_NEGOTIATION]: [STATUS.APPROVED, STATUS.REJECTED],
  [STATUS.APPROVED]:       [STATUS.EN_CURSO],
  [STATUS.REJECTED]:       [STATUS.DRAFT],
  [STATUS.EN_CURSO]:       [STATUS.COMPLETED],
  [STATUS.COMPLETED]:      []
}
