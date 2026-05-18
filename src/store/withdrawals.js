import { defineStore } from 'pinia'
import { db, storage, auth } from '../firebase/firebaseConfig'
import {
  collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { ref as sref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

/**
 * Firestore collection: `partner_withdrawals`
 *   { date, amount, partnerId, partnerName, type,
 *     description, receiptUrl?, receiptPath?,
 *     ownerUid, createdAt }
 *
 * IMPORTANT: these are equity distributions, not expenses.
 * They impact cash flow but NOT the income statement / margin.
 */
export const useWithdrawalsStore = defineStore('withdrawals', {
  state: () => ({
    items: [],
    loading: false,
    uploading: false
  }),

  getters: {
    byMonth: (s) => (ym) =>
      s.items.filter(w => (w.date || '').startsWith(ym)),

    totalByPartner: (s) => (ym) => {
      const totals = {}
      for (const w of s.items) {
        if (ym && !(w.date || '').startsWith(ym)) continue
        const k = w.partnerId || 'unknown'
        if (!totals[k]) totals[k] = { name: w.partnerName, amount: 0, count: 0 }
        totals[k].amount += Number(w.amount || 0)
        totals[k].count += 1
      }
      return totals
    },

    totalByType: (s) => (ym) => {
      const totals = {}
      for (const w of s.items) {
        if (ym && !(w.date || '').startsWith(ym)) continue
        totals[w.type] = (totals[w.type] || 0) + Number(w.amount || 0)
      }
      return totals
    },

    monthlyTotal: (s) => (ym) =>
      s.items
        .filter(w => (w.date || '').startsWith(ym))
        .reduce((sum, w) => sum + Number(w.amount || 0), 0)
  },

  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const user = auth.currentUser
        if (!user) return
        const q = query(collection(db, 'partner_withdrawals'), where('ownerUid', '==', user.uid))
        const snap = await getDocs(q)
        this.items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        this.items.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      } catch (e) {
        console.error('fetchWithdrawals error', e)
      } finally {
        this.loading = false
      }
    },

    async addWithdrawal(payload, file) {
      const user = auth.currentUser
      if (!user) throw new Error('No auth')

      let receiptUrl = null
      let receiptPath = null
      if (file) {
        this.uploading = true
        try {
          const safeName = file.name.replace(/[^\w.\-]+/g, '_')
          receiptPath = `withdrawal_receipts/${user.uid}/${Date.now()}_${safeName}`
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
        partnerId: payload.partnerId,
        partnerName: payload.partnerName,
        type: payload.type,
        description: payload.description || '',
        receiptUrl,
        receiptPath,
        ownerUid: user.uid,
        createdAt: serverTimestamp()
      }
      const ref = await addDoc(collection(db, 'partner_withdrawals'), data)
      const local = { id: ref.id, ...data, createdAt: new Date() }
      this.items.unshift(local)
      return local
    },

    async deleteWithdrawal(item) {
      await deleteDoc(doc(db, 'partner_withdrawals', item.id))
      if (item.receiptPath) {
        try { await deleteObject(sref(storage, item.receiptPath)) }
        catch (_) {}
      }
      this.items = this.items.filter(x => x.id !== item.id)
    }
  }
})
