import { defineStore } from 'pinia'
import { db, auth } from '../firebase/firebaseConfig'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { TASK_STATUS } from '../constants/tasks'

/**
 * Firestore collection: `tasks`
 *   { title, description,
 *     assignedTo: workerId | null, assignedToName: string,
 *     projectId: string | null, projectName: string | null,
 *     priority: 'Alta'|'Media'|'Baja',
 *     status: 'Pendiente'|'EnProgreso'|'Completada',
 *     dueDate: 'YYYY-MM-DD' | null,
 *     createdBy, createdAt, completedAt? }
 */
export const useTasksStore = defineStore('tasks', {
  state: () => ({
    items: [],
    loading: false
  }),
  getters: {
    byStatus: (s) => (status) => s.items.filter(t => t.status === status),
    byAssignee: (s) => (workerId) => s.items.filter(t => t.assignedTo === workerId),
    byProject: (s) => (projectId) => s.items.filter(t => t.projectId === projectId),
    pendingCount: (s) => s.items.filter(t => t.status !== TASK_STATUS.COMPLETADA).length,
    overdueCount: (s) => {
      const today = new Date().toISOString().slice(0, 10)
      return s.items.filter(t =>
        t.status !== TASK_STATUS.COMPLETADA &&
        t.dueDate && t.dueDate < today
      ).length
    }
  },
  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const snap = await getDocs(collection(db, 'tasks'))
        this.items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        this.items.sort((a, b) => {
          // pending first, then by dueDate ascending, then by priority
          if (a.status === 'Completada' && b.status !== 'Completada') return 1
          if (b.status === 'Completada' && a.status !== 'Completada') return -1
          return (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
        })
      } catch (e) {
        console.error('fetchTasks error', e)
      } finally {
        this.loading = false
      }
    },
    async create(payload) {
      const user = auth.currentUser
      const data = {
        title: payload.title,
        description: payload.description || '',
        assignedTo: payload.assignedTo || null,
        assignedToName: payload.assignedToName || '',
        projectId: payload.projectId || null,
        projectName: payload.projectName || '',
        priority: payload.priority || 'Media',
        status: TASK_STATUS.PENDIENTE,
        dueDate: payload.dueDate || null,
        createdBy: user?.email || user?.uid || 'system',
        createdAt: serverTimestamp()
      }
      const ref = await addDoc(collection(db, 'tasks'), data)
      this.items.unshift({ id: ref.id, ...data, createdAt: new Date() })
    },
    async update(item, changes) {
      await updateDoc(doc(db, 'tasks', item.id), changes)
      const idx = this.items.findIndex(t => t.id === item.id)
      if (idx >= 0) this.items[idx] = { ...this.items[idx], ...changes }
    },
    async setStatus(item, status) {
      const changes = { status }
      if (status === TASK_STATUS.COMPLETADA) changes.completedAt = serverTimestamp()
      await this.update(item, changes)
    },
    async remove(item) {
      await deleteDoc(doc(db, 'tasks', item.id))
      this.items = this.items.filter(t => t.id !== item.id)
    }
  }
})
