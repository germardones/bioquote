import { defineStore } from 'pinia'
import { db, auth } from '../firebase/firebaseConfig'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'

/**
 * Firestore collection: `quote_templates`
 *   {
 *     name, description,
 *     type: 'parametric' | 'custom',
 *     specs: { entidades, roles, vistas, apis, complejidad },
 *     customItems: [{ description, hours, rate, fixedValue, pricingMethod }],
 *     scope, exclusions,
 *     createdBy, createdAt
 *   }
 */
export const useQuoteTemplatesStore = defineStore('quoteTemplates', {
  state: () => ({
    items: [],
    loading: false
  }),
  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const snap = await getDocs(collection(db, 'quote_templates'))
        this.items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        this.items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      } catch (e) {
        console.error('fetchTemplates error', e)
      } finally {
        this.loading = false
      }
    },
    async create(payload) {
      const user = auth.currentUser
      const data = {
        name: payload.name,
        description: payload.description || '',
        type: payload.type || 'parametric',
        specs: payload.specs || {},
        customItems: payload.customItems || [],
        scope: payload.scope || '',
        exclusions: payload.exclusions || '',
        createdBy: user?.email || user?.uid || 'system',
        createdAt: serverTimestamp()
      }
      const ref = await addDoc(collection(db, 'quote_templates'), data)
      this.items.unshift({ id: ref.id, ...data })
    },
    async update(id, changes) {
      await updateDoc(doc(db, 'quote_templates', id), changes)
      const idx = this.items.findIndex(t => t.id === id)
      if (idx >= 0) this.items[idx] = { ...this.items[idx], ...changes }
    },
    async remove(id) {
      await deleteDoc(doc(db, 'quote_templates', id))
      this.items = this.items.filter(t => t.id !== id)
    }
  }
})
