<template>
  <div class="bell-wrap" ref="wrapEl">
    <button class="bell-btn" @click="toggle" :title="`${unreadCount} sin leer`">
      <i class="fa-solid fa-bell"></i>
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <div v-if="open" class="bell-dropdown">
      <div class="dropdown-head">
        <strong>Notificaciones</strong>
        <button v-if="items.length > 0" class="link-btn" @click="markAllRead">Marcar todas leídas</button>
      </div>
      <div v-if="loading" class="loading">Cargando...</div>
      <div v-else-if="items.length === 0" class="empty">
        <i class="fa-regular fa-bell-slash"></i>
        <p>Sin notificaciones.</p>
      </div>
      <ul v-else class="notif-list">
        <li
          v-for="n in items" :key="n.id"
          class="notif-item"
          :class="[n.type, { unread: !readIds.has(n.id) }]"
          @click="onClick(n)"
        >
          <span class="notif-icon"><i :class="'fa-solid ' + n.icon"></i></span>
          <div class="notif-body">
            <div class="notif-title">{{ n.title }}</div>
            <div class="notif-detail">{{ n.detail }}</div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications } from '../composables/useNotifications'

const router = useRouter()
const { items, loading, unreadCount, readIds, generate, markAsRead, markAllRead } = useNotifications()

const open = ref(false)
const wrapEl = ref(null)
const toggle = () => { open.value = !open.value; if (open.value) generate() }
const close = () => { open.value = false }

const onClick = (n) => {
  markAsRead(n.id)
  if (n.link) router.push(n.link)
  open.value = false
}

// Outside click handler
const onDocClick = (e) => {
  if (open.value && wrapEl.value && !wrapEl.value.contains(e.target)) close()
}

let intervalId
onMounted(() => {
  generate()
  document.addEventListener('click', onDocClick)
  intervalId = setInterval(() => generate(), 5 * 60 * 1000)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  clearInterval(intervalId)
})
</script>

<style scoped>
.bell-wrap { position: relative; }
.bell-btn {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: var(--text-on-header);
  width: 40px; height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.05rem;
  position: relative;
  transition: all 0.2s;
}
.bell-btn:hover { background: rgba(255,255,255,0.18); }
.badge {
  position: absolute;
  top: -2px; right: -2px;
  background: #ef4444;
  color: white;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  border: 2px solid var(--bg-header);
}

.bell-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-width: calc(100vw - 2rem);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 12px 24px rgba(0,0,0,0.18);
  z-index: 1500;
  overflow: hidden;
}
.dropdown-head {
  padding: 0.85rem 1rem;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
  background: var(--bg-app);
}
.link-btn { background: none; border: none; color: var(--primary); cursor: pointer; font-size: 0.82rem; font-weight: 600; padding: 0; }

.notif-list { list-style: none; margin: 0; padding: 0; max-height: 360px; overflow-y: auto; }
.notif-item {
  display: flex; gap: 10px;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background 0.15s;
  border-left: 3px solid transparent;
}
.notif-item:hover { background: var(--bg-app); }
.notif-item:last-child { border-bottom: none; }
.notif-item.unread { background: rgba(0,131,102,0.04); }
.notif-item.warning { border-left-color: #f59e0b; }
.notif-item.danger  { border-left-color: #ef4444; }
.notif-item.info    { border-left-color: #3b82f6; }

.notif-icon {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: var(--bg-app);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.85rem;
  flex-shrink: 0;
  color: var(--text-muted);
}
.notif-item.warning .notif-icon { background: rgba(245,158,11,0.15); color: #f59e0b; }
.notif-item.danger  .notif-icon { background: rgba(239,68,68,0.15); color: #ef4444; }
.notif-item.info    .notif-icon { background: rgba(59,130,246,0.15); color: #3b82f6; }

.notif-body { flex: 1; min-width: 0; }
.notif-title { font-size: 0.88rem; font-weight: 600; color: var(--text-main); }
.notif-detail { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }

.empty, .loading { padding: 2rem 1rem; text-align: center; color: var(--text-muted); }
.empty i { font-size: 1.8rem; display: block; margin-bottom: 0.5rem; }
.empty p { margin: 0; font-size: 0.9rem; }
</style>
