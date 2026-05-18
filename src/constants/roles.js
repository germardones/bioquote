// Role-based access control (Fase 5.2)

export const ROLES = {
  ADMIN: 'admin',
  GERENTE: 'gerente',
  VENDEDOR: 'vendedor',
  DESARROLLADOR: 'desarrollador'
}

export const ROLE_LABELS = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  desarrollador: 'Desarrollador'
}

// Sections allowed per role (used to filter Dashboard cards and as router meta)
// Use string keys that match the data-category in Dashboard sections.
export const SECTIONS = {
  OPERATIONS: 'operations',
  SALES: 'sales',
  CRM: 'crm',
  FINANCIAL: 'financial',
  TEAM: 'team',
  ADMIN: 'admin',
  TASKS: 'tasks',
  REPORTS: 'reports',
  CALENDAR: 'calendar',
  WITHDRAWALS: 'withdrawals'
}

export const ROLE_SECTIONS = {
  admin:         ['operations', 'sales', 'crm', 'financial', 'team', 'admin', 'tasks', 'reports', 'calendar', 'withdrawals'],
  gerente:       ['operations', 'sales', 'crm', 'financial', 'team',          'tasks', 'reports', 'calendar', 'withdrawals'],
  vendedor:      [              'sales', 'crm',                                                   'calendar'],
  desarrollador: ['operations',                                                'tasks',           'calendar']
}

// Path prefixes mapped to required sections (used by router guard)
export const ROUTE_SECTIONS = [
  { prefix: '/admin',                section: 'admin' },
  { prefix: '/usuarios',             section: 'team' },
  { prefix: '/equipo',               section: 'team' },
  { prefix: '/tareas',               section: 'tasks' },
  { prefix: '/reportes',             section: 'reports' },
  { prefix: '/finanzas/retiros',     section: 'withdrawals' },
  { prefix: '/finanzas',             section: 'financial' },
  { prefix: '/clientes',             section: 'crm' },
  { prefix: '/leads',                section: 'crm' },
  { prefix: '/prospectos',           section: 'crm' },
  { prefix: '/crm',                  section: 'crm' },
  { prefix: '/cotizar',              section: 'sales' },
  { prefix: '/cotizaciones',         section: 'sales' },
  { prefix: '/proyectos-en-curso',   section: 'operations' },
  { prefix: '/proyectos',            section: 'operations' },
  { prefix: '/pagos',                section: 'financial' }
]

export const sectionForPath = (path) => {
  const match = ROUTE_SECTIONS.find(r => path.startsWith(r.prefix))
  return match?.section || null
}

export const canAccess = (role, section) => {
  if (!role) return false
  return (ROLE_SECTIONS[role] || []).includes(section)
}

export const canSeeSalary = (role) => role === 'admin' || role === 'gerente'
