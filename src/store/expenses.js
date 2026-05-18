import { defineStore } from 'pinia'
import { db, storage, auth } from '../firebase/firebaseConfig'
import {
  collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { ref as sref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

/**
 * Operational expenses store (Fase 2.1).
 *
 * Firestore collection: `expenses`
 *   { date: ISO 'YYYY-MM-DD', amount: number, category: string,
 *     description: string, responsible: string,
 *     receiptUrl?: string, receiptPath?: string,
 *     ownerUid: string, createdAt: serverTimestamp }
 *
 * Storage path for receipts: receipts/{uid}/{timestamp}_{filename}
 */
export const useExpensesStore = defineStore('expenses', {
  state: () => ({
    items: [],
    loading: false,
    uploading: false
  }),

  getters: {
    // Filter by year-month (e.g. '2026-05')
    byMonth: (state) => (ym) =>
      state.items.filter(e => (e.date || '').startsWith(ym)),

    totalByCategory: (state) => (ym) => {
      const totals = {}
      for (const e of state.items) {
        if (ym && !(e.date || '').startsWith(ym)) continue
        totals[e.category] = (totals[e.category] || 0) + Number(e.amount || 0)
      }
      return totals
    },

    monthlyTotal: (state) => (ym) =>
      state.items
        .filter(e => (e.date || '').startsWith(ym))
        .reduce((s, e) => s + Number(e.amount || 0), 0)
  },

  actions: {
    async fetchExpenses() {
      this.loading = true
      try {
        const user = auth.currentUser
        if (!user) return
        const q = query(collection(db, 'expenses'), where('ownerUid', '==', user.uid))
        const snap = await getDocs(q)
        this.items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        // Sort newest first
        this.items.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      } catch (e) {
        console.error('fetchExpenses error', e)
      } finally {
        this.loading = false
      }
    },

    async addExpense(payload, file) {
      const user = auth.currentUser
      if (!user) throw new Error('No auth')

      let receiptUrl = null
      let receiptPath = null

      if (file) {
        this.uploading = true
        try {
          const safeName = file.name.replace(/[^\w.\-]+/g, '_')
          receiptPath = `receipts/${user.uid}/${Date.now()}_${safeName}`
          const fileRef = sref(storage, receiptPath)
          await uploadBytes(fileRef, file)
          receiptUrl = await getDownloadURL(fileRef)
        } finally {
          this.uploading = false
        }
      }

      const data = {
        date: payload.date,
        amount: Number(payload.amount),
        category: payload.category,
        description: payload.description || '',
        responsible: payload.responsible || (user.displayName || user.email || ''),
        receiptUrl,
        receiptPath,
        ownerUid: user.uid,
        createdAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'expenses'), data)
      const local = { id: docRef.id, ...data, createdAt: new Date() }
      this.items.unshift(local)
      return local
    },

    async deleteExpense(item) {
      await deleteDoc(doc(db, 'expenses', item.id))
      if (item.receiptPath) {
        try { await deleteObject(sref(storage, item.receiptPath)) }
        catch (e) { /* file may not exist anymore */ }
      }
      this.items = this.items.filter(x => x.id !== item.id)
    }
  }
})
