import { ref, watch } from 'vue'

const STORAGE_KEY = 'bb_sidebar_collapsed_v1'

// Module-singleton state so toggling from anywhere updates everywhere
const collapsed = ref(localStorage.getItem(STORAGE_KEY) === '1')
const mobileOpen = ref(false)

watch(collapsed, (v) => {
  localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
})

export function useSidebar() {
  return {
    collapsed,
    mobileOpen,
    toggleCollapsed: () => { collapsed.value = !collapsed.value },
    openMobile: () => { mobileOpen.value = true },
    closeMobile: () => { mobileOpen.value = false },
    toggleMobile: () => { mobileOpen.value = !mobileOpen.value }
  }
}
