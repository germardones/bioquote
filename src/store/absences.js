import { defineStore } from 'pinia'
import { db, auth } from '../firebase/firebaseConfig'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { ABSENCE_STATUS, daysBetween } from '../constants/employee'

/**
 * Firestore collection: `absences`
 *   { workerId, workerName, type, startDate (YYYY-MM-DD), endDate (YYYY-MM-DD),
 *     days, reason, status, requestedBy, requestedAt, approvedBy?, approvedAt? }
 */
export const useAbsencesStore = defineStore('absences', {
  state: () => ({
    items: [],
    loading: false
  }),
  getters: {
    pendingCount: (s) => s.items.filter(a => a.status === ABSENCE_STATUS.PENDING).length,
    approvedForWorker: (s) => (workerId, type = 'vacaciones') =>
      s.items
        .filter(a => a.workerId === workerId && a.type === type && a.status === ABSENCE_STATUS.APPROVED)
        .reduce((sum, a) => sum + Number(a.days || 0), 0),
    forMonth: (s) => (ym) =>
      s.items.filter(a => {
        if (!a.startDate || !a.endDate) return false
        return a.startDate.slice(0, 7) <= ym && a.endDate.slice(0, 7) >= ym
      })
  },
  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const snap = await getDocs(collection(db, 'absences'))
        this.items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        this.items.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
      } catch (e) {
        console.error('fetchAbsences error', e)
      } finally {
        this.loading = false
      }
    },
    async request({ workerId, workerName, type, startDate, endDate, reason }) {
      const user = auth.currentUser
      const days = daysBetween(startDate, endDate)
      const data = {
        workerId, workerName, type, startDate, endDate, days,
        reason: reason || '',
        status: ABSENCE_STATUS.PENDING,
        requestedBy: user?.email || user?.uid || 'system',
        requestedAt: serverTimestamp(),
        approvedBy: null,
        approvedAt: null
      }
      const ref = await addDoc(collection(db, 'absences'), data)
      this.items.unshift({ id: ref.id, ...data, requestedAt: new Date() })
    },
    async setStatus(item, newStatus) {
      const user = auth.currentUser
      const update = {
        status: newStatus,
        approvedBy: user?.email || user?.uid || 'system',
        approvedAt: serverTimestamp()
      }
      await updateDoc(doc(db, 'absences', item.id), update)
      const idx = this.items.findIndex(x => x.id === item.id)
      if (idx >= 0) this.items[idx] = { ...this.items[idx], ...update, approvedAt: new Date() }
    },
    async remove(item) {
      await deleteDoc(doc(db, 'absences', item.id))
      this.items = this.items.filter(x => x.id !== item.id)
    }
  }
})
