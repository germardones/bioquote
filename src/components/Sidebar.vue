<template>
  <!-- Mobile overlay -->
  <div v-if="mobileOpen" class="sb-overlay" @click="closeMobile"></div>

  <aside class="sidebar" :class="{ collapsed, 'mobile-open': mobileOpen }">
    <div class="sb-head">
      <button class="sb-toggle" @click="toggleCollapsed" :title="collapsed ? 'Expandir' : 'Colapsar'">
        <i class="fa-solid" :class="collapsed ? 'fa-chevron-right' : 'fa-chevron-left'"></i>
      </button>
    </div>

    <nav class="sb-nav">
      <!-- Inicio (siempre visible, sin grupo) -->
      <RouterLink to="/dashboard" class="sb-home" active-class="active" @click="closeMobile">
        <span class="sb-label">Inicio</span>
      </RouterLink>

      <template v-for="g in visibleGroups" :key="g.label">
        <div class="sb-group" :class="{ open: isOpen(g.label) }">
          <button
            class="sb-group-header"
            :style="{ '--accent': g.color }"
            @click="toggleGroup(g.label)"
          >
            <span class="sb-label group-name">{{ g.label }}</span>
            <i class="fa-solid sb-chev" :class="isOpen(g.label) ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
          </button>

          <transition name="slide">
            <div v-if="isOpen(g.label)" class="sb-submenu" :style="{ '--accent': g.color }">
              <RouterLink
                v-for="item in g.items"
                :key="item.path"
                :to="item.path"
                class="sb-item"
                active-class="active"
                @click="closeMobile"
              >
                <span class="sb-label">{{ item.label }}</span>
              </RouterLink>
            </div>
          </transition>
        </div>
      </template>
    </nav>

    <div class="sb-footer">
      <div class="sb-role" v-if="role">
        <span class="sb-label">{{ roleLabel }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useSidebar } from '../composables/useSidebar'
import { useRole } from '../composables/useRole'
import { ROLE_LABELS } from '../constants/roles'

const { collapsed, mobileOpen, toggleCollapsed, closeMobile } = useSidebar()
const { role, canAccess } = useRole()
const roleLabel = computed(() => ROLE_LABELS[role.value] || '')

const NAV_GROUPS = [
  {
    label: 'Operaciones', color: '#3b82f6', section: 'operations',
    items: [
      { label: 'Proyectos en Curso', path: '/proyectos-en-curso', section: 'operations' }
    ]
  },
  {
    label: 'Tareas', color: '#3b82f6', section: 'tasks',
    items: [
      { label: 'Tareas Internas', path: '/tareas', section: 'tasks' }
    ]
  },
  {
    label: 'Ventas', color: '#22c55e', section: 'sales',
    items: [
      { label: 'Calculadora rápida',  path: '/calculadora',  section: 'sales' },
      { label: 'Nueva Cotización',    path: '/cotizar',      section: 'sales' },
      { label: 'Total Cotizaciones',  path: '/cotizaciones', section: 'sales' }
    ]
  },
  {
    label: 'CRM & Clientes', color: '#8b5cf6', section: 'crm',
    items: [
      { label: 'Clientes',          path: '/clientes',     section: 'crm' },
      { label: 'Matriz CRM',        path: '/crm/followup', section: 'crm' },
      { label: 'Leads Web',         path: '/leads',        section: 'crm' }
    ]
  },
  {
    label: 'Financiero', color: '#f97316', section: 'financial',
    items: [
      { label: 'Total Vendido',         path: '/finanzas/ventas',             section: 'financial' },
      { label: 'Recaudación',           path: '/finanzas/recaudacion',        section: 'financial' },
      { label: 'Flujo de Caja',         path: '/finanzas/flujo-caja',         section: 'financial' },
      { label: 'Proyección',            path: '/finanzas/proyeccion',         section: 'financial' },
      { label: 'Costo Real',            path: '/finanzas/costos',             section: 'financial' },
      { label: 'Gastos Operacionales',  path: '/finanzas/gastos',             section: 'financial' },
      { label: 'Estado Resultados',     path: '/finanzas/estado-resultados',  section: 'financial' },
      { label: 'Retiros de Socios',     path: '/finanzas/retiros',            section: 'withdrawals' }
    ]
  },
  {
    label: 'Equipo', color: '#dc2626', section: 'team',
    items: [
      { label: 'Colaboradores', path: '/usuarios',         section: 'team' },
      { label: 'Ausencias',     path: '/equipo/ausencias', section: 'team' }
    ]
  },
  {
    label: 'Reportes', color: '#0ea5e9', section: 'reports',
    items: [
      { label: 'Reportes Generales', path: '/reportes', section: 'reports' }
    ]
  },
  {
    label: 'Admin', color: '#dd3535', section: 'admin',
    items: [
      { label: 'Configuración',       path: '/admin/config',     section: 'admin' },
      { label: 'Plantillas Cotiz.',   path: '/admin/plantillas', section: 'admin' },
      { label: 'Agenda',              path: '/admin/calendar',   section: 'calendar' }
    ]
  }
]

const visibleGroups = computed(() =>
  NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(i => canAccess(i.section)) }))
    .filter(g => g.items.length > 0)
)

// Persisted per-group open state
const OPEN_KEY = 'bb_sidebar_open_groups_v1'
const openGroups = ref(new Set(JSON.parse(localStorage.getItem(OPEN_KEY) || '[]')))
const isOpen = (label) => openGroups.value.has(label)
const toggleGroup = (label) => {
  const s = new Set(openGroups.value)
  s.has(label) ? s.delete(label) : s.add(label)
  openGroups.value = s
}
watch(openGroups, (v) => localStorage.setItem(OPEN_KEY, JSON.stringify([...v])), { deep: true })
</script>

<style scoped>
.sidebar {
  width: 240px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-color);
  position: sticky;
  top: 76px;
  height: calc(100vh - 76px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  flex-shrink: 0;
  z-index: 50;
  /* Hide scrollbar visually but keep scrolling */
  scrollbar-width: none;          /* Firefox */
  -ms-overflow-style: none;       /* IE / Edge legacy */
}
.sidebar::-webkit-scrollbar { width: 0; height: 0; display: none; }  /* Chrome / Safari */
.sidebar.collapsed { width: 56px; }

.sb-head {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}
.sb-toggle {
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  width: 30px; height: 30px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
}
.sb-toggle:hover { color: var(--primary); border-color: var(--primary); }

.sb-nav {
  flex: 1;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Inicio */
.sb-home {
  display: block;
  padding: 10px 14px;
  border-radius: 6px;
  color: var(--text-main);
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 700;
  border-left: 3px solid var(--primary);
  background: var(--bg-app);
  margin-bottom: 0.5rem;
}
.sb-home.active { background: rgba(0,131,102,0.12); color: var(--primary); }
.sb-home:hover { background: rgba(0,131,102,0.08); }

/* Group header */
.sb-group { margin: 2px 0; }
.sb-group-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  border: none;
  padding: 10px 14px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 800;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 6px;
  border-left: 3px solid transparent;
  transition: all 0.15s;
}
.sb-group-header:hover {
  color: var(--text-main);
  background: var(--bg-app);
  border-left-color: var(--accent);
}
.sb-group.open .sb-group-header {
  color: var(--accent);
  border-left-color: var(--accent);
}
.sb-chev { font-size: 0.65rem; }

/* Submenu — visually distinct */
.sb-submenu {
  background: var(--bg-app);
  border-left: 3px solid var(--accent);
  border-radius: 0 6px 6px 0;
  margin: 4px 0 6px 0;
  padding: 4px 0;
  overflow: hidden;
}

.sb-item {
  display: block;
  padding: 8px 14px 8px 22px;
  color: var(--text-main);
  text-decoration: none;
  font-size: 0.86rem;
  font-weight: 500;
  border-left: 2px solid transparent;
  margin-left: -3px;       /* align highlight with group accent */
  transition: all 0.15s;
}
.sb-item:hover {
  background: var(--bg-surface);
  color: var(--accent);
}
.sb-item.active {
  background: var(--bg-surface);
  color: var(--accent);
  font-weight: 700;
  border-left-color: var(--accent);
}

/* Slide transition */
.slide-enter-active, .slide-leave-active {
  transition: max-height 0.22s ease, opacity 0.18s ease;
  overflow: hidden;
}
.slide-enter-from, .slide-leave-to { max-height: 0; opacity: 0; }
.slide-enter-to, .slide-leave-from { max-height: 800px; opacity: 1; }

/* Footer */
.sb-footer {
  border-top: 1px solid var(--border-color);
  padding: 0.75rem 0.75rem;
}
.sb-role {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  background: var(--bg-app);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Collapsed: hide everything except a vertical strip */
.sidebar.collapsed .sb-label,
.sidebar.collapsed .sb-chev,
.sidebar.collapsed .sb-submenu {
  display: none;
}
.sidebar.collapsed .sb-group-header,
.sidebar.collapsed .sb-home,
.sidebar.collapsed .sb-role {
  padding: 10px 6px;
  text-align: center;
}
.sidebar.collapsed .sb-group-header::after {
  content: "■";
  color: var(--accent);
  font-size: 0.8rem;
}
.sidebar.collapsed .sb-home::after {
  content: "•";
  display: block;
  color: var(--primary);
  font-weight: 800;
}

/* Mobile */
.sb-overlay { display: none; }

@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    top: 0; left: 0;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.25s ease, width 0.2s ease;
    width: 260px;
    z-index: 200;
    box-shadow: 4px 0 12px rgba(0,0,0,0.2);
  }
  .sidebar.collapsed { width: 260px; }
  .sidebar.mobile-open { transform: translateX(0); }
  .sidebar.collapsed .sb-label,
  .sidebar.collapsed .sb-chev { display: inline; }
  .sidebar.collapsed .sb-submenu { display: block; }
  .sidebar.collapsed .sb-group-header::after,
  .sidebar.collapsed .sb-home::after { content: none; }
  .sb-toggle { display: none; }
  .sb-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 150; }
}
</style>
