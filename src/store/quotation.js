// quotation.js
import { defineStore } from 'pinia'

export const useQuotationStore = defineStore('quotation', {
  state: () => ({
    servicio: null,
    adicionales: [],
    horasExtra: 0,
    cliente: {
      nombre: '',
      contacto: '',
      razonSocial: '',
      rut: '',
      servicioDeseado: ''
    }
  }),
  getters: {
    total() {
      let base = this.servicio?.cobroBase || 0
      let adicionales = this.adicionales.reduce((sum, item) => sum + item.precio, 0)
      let extra = this.horasExtra * (this.servicio?.cobroAdicional || 0)
      return base + adicionales + extra
    }
  },
  actions: {
    reset() {
      this.servicio = null
      this.adicionales = []
      this.horasExtra = 0
      this.cliente = { nombre: '', contacto: '', razonSocial: '', rut: '', servicioDeseado: '' }
    }
  }
})
