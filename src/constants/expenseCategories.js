// Categories for operational expenses (Fase 2.1)

export const EXPENSE_CATEGORIES = [
  { id: 'arriendo',     label: 'Arriendo',          color: '#3b82f6', icon: 'fa-building' },
  { id: 'sueldos',      label: 'Sueldos',           color: '#ef4444', icon: 'fa-user-tie' },
  { id: 'software',     label: 'Software/Suscripciones', color: '#8b5cf6', icon: 'fa-cloud' },
  { id: 'proveedores',  label: 'Proveedores',       color: '#f59e0b', icon: 'fa-truck' },
  { id: 'marketing',    label: 'Marketing',         color: '#ec4899', icon: 'fa-bullhorn' },
  { id: 'otros',        label: 'Otros',             color: '#64748b', icon: 'fa-ellipsis' }
]

export const CATEGORY_META = Object.fromEntries(
  EXPENSE_CATEGORIES.map(c => [c.id, c])
)

export const categoryLabel = (id) => CATEGORY_META[id]?.label || id || '—'
export const categoryColor = (id) => CATEGORY_META[id]?.color || '#64748b'
