import { ref, computed, onMounted } from 'vue'
import { auth, db } from '../firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'
import { canAccess as canAccessSection, canSeeSalary as canSeeSalaryForRole, ROLES } from '../constants/roles'

// Module-level cache so we don't re-read Firestore on every component mount
const role = ref(null)
const ready = ref(false)
let pending = null

async function ensureLoaded() {
  if (ready.value) return role.value
  if (pending) return pending
  pending = (async () => {
    const user = auth.currentUser
    if (!user) { role.value = null; ready.value = true; return null }
    try {
      const snap = await getDoc(doc(db, 'usuarios', user.uid))
      role.value = snap.exists() ? (snap.data().rol || ROLES.VENDEDOR) : ROLES.VENDEDOR
    } catch {
      role.value = ROLES.VENDEDOR
    }
    ready.value = true
    return role.value
  })()
  const v = await pending
  pending = null
  return v
}

// Reset cache when user signs out / changes
auth.onAuthStateChanged(() => {
  role.value = null
  ready.value = false
  pending = null
})

export function useRole() {
  onMounted(() => { ensureLoaded() })
  return {
    role,
    ready,
    isAdmin: computed(() => role.value === ROLES.ADMIN),
    canAccess: (section) => canAccessSection(role.value, section),
    canSeeSalary: computed(() => canSeeSalaryForRole(role.value)),
    refresh: ensureLoaded
  }
}

export { ensureLoaded as preloadRole }
