// quotation.js
import { defineStore } from 'pinia'

export const useQuotationStore = defineStore('quotation', {
  state: () => ({
    servicio: null,           // ✅ si quieres mantener el modo de un solo servicio
    servicios: [],            // ✅ agregado para múltiples servicios
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
      // Si hay múltiples servicios, sumamos todos los cobrosBase
      let totalServicios = this.servicios.length
        ? this.servicios.reduce((sum, s) => sum + (s.cobroBase || 0), 0)
        : this.servicio?.cobroBase || 0

      let adicionales = this.adicionales.reduce((sum, item) => sum + item.precio, 0)

      let cobroAdicional = this.servicio?.cobroAdicional || 0
      let extra = this.horasExtra * cobroAdicional

      return totalServicios + adicionales + extra
    }
  },
  actions: {
    reset() {
      this.servicio = null
      this.servicios = []
      this.adicionales = []
      this.horasExtra = 0
      this.cliente = {
        nombre: '',
        contacto: '',
        razonSocial: '',
        rut: '',
        servicioDeseado: ''
      }
    }
  }
})
