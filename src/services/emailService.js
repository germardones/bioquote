import { db } from '../firebase/firebaseConfig'
import { doc, updateDoc } from 'firebase/firestore'

const FIRMA = `

Saludos cordiales,
Germán Mardones
Director | BioBio Code
Tel: +56998328942 | german.mardones@biobiocode.cl`

const TEMPLATES = {
  nuevo: {
    asunto: (lead) => `Propuesta de colaboración para ${lead.empresa}`,
    cuerpo: (lead) => `Estimado equipo de ${lead.empresa},

Mi nombre es Germán Mardones de BioBio Code. Me contacto porque identificamos a ${lead.empresa} como una empresa destacada en ${lead.ciudad} y creemos que podríamos generar una colaboración de valor.

Nos especializamos en digitalización de procesos operativos internos para empresas de servicios en la región del Biobío, ayudándolas a reducir tiempos, errores y costos sin interrumpir su operación habitual.

¿Les parece bien coordinar una llamada de 15 minutos esta semana para explorar si hay un fit?${FIRMA}`,
    estadoSiguiente: 'email_enviado'
  },

  email_enviado: {
    asunto: (lead) => `Re: Propuesta para ${lead.empresa}`,
    cuerpo: (lead) => `Estimado equipo de ${lead.empresa},

Quería hacer un seguimiento rápido al mensaje que les envié hace unos días.

Entiendo que el día a día es muy demandante, por eso seré breve: nuestra especialidad en digitalización de procesos podría ayudar a ${lead.empresa} a operar de forma más eficiente sin grandes inversiones ni cambios disruptivos.

¿Tienen 15 minutos esta semana para una llamada?${FIRMA}`,
    estadoSiguiente: 'seg_3d'
  },

  seg_3d: {
    asunto: (lead) => `Última consulta – ${lead.empresa}`,
    cuerpo: (lead) => `Estimado equipo de ${lead.empresa},

Les escribo nuevamente para saber si recibieron mis mensajes anteriores.

Si no es el momento adecuado, lo entiendo perfectamente. Solo háganme saber y no los molesto más.

Si en algún momento les interesa conversar sobre cómo digitalizar sus procesos operativos, estaré disponible cuando lo necesiten.${FIRMA}`,
    estadoSiguiente: 'seg_5d'
  },

  seg_5d: {
    asunto: (lead) => `¿Seguimos en contacto? – ${lead.empresa}`,
    cuerpo: (lead) => `Estimado equipo de ${lead.empresa},

Han pasado algunas semanas desde mi primer mensaje. No quiero ser insistente, pero sí dejar abierta la puerta.

Si en algún momento surge la necesidad de digitalizar o automatizar procesos internos en ${lead.empresa}, me gustaría ser su primera opción de contacto.

Quedo a disposición cuando lo estimen conveniente.${FIRMA}`,
    estadoSiguiente: 'seg_14d'
  }
}

export const ESTADOS_FINALES = ['seg_14d', 'respondio', 'reunion_agendada', 'no_interesado']

// Days since fecha_email_inicial required before each follow-up can be sent
export const DIAS_SEGUIMIENTO = { email_enviado: 3, seg_3d: 5, seg_5d: 14 }

export const puedeEnviarEmail = (lead) =>
  !!(lead.email && !ESTADOS_FINALES.includes(lead.estado) && TEMPLATES[lead.estado])

export const getTemplate = (lead) => {
  const t = TEMPLATES[lead.estado]
  if (!t) return null
  return {
    asunto: t.asunto(lead),
    cuerpo: t.cuerpo(lead),
    estadoSiguiente: t.estadoSiguiente
  }
}

export const getTemplateFor = (lead, key) => {
  const t = TEMPLATES[key]
  if (!t) return null
  return {
    asunto: t.asunto(lead),
    cuerpo: t.cuerpo(lead),
    estadoSiguiente: t.estadoSiguiente
  }
}

export const debeEnviarHoy = (lead) => {
  if (!puedeEnviarEmail(lead)) return false
  if (lead.estado === 'nuevo') return true
  const fecha = lead.fecha_email_inicial
  if (!fecha) return false
  const diasNecesarios = DIAS_SEGUIMIENTO[lead.estado]
  if (!diasNecesarios) return false
  const diff = Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000)
  return diff >= diasNecesarios
}

export const enviarEmail = async (lead, asunto, cuerpo, templateKey = null) => {
  const key = templateKey || lead.estado
  const t = TEMPLATES[key]
  if (!t) throw new Error('Estado sin template de email')

  const res = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: lead.email, subject: asunto, body: cuerpo })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Error al enviar email')
  }

  const hoy = new Date().toISOString().split('T')[0]
  const update = { estado: t.estadoSiguiente, fecha_contacto: hoy }
  if (lead.estado === 'nuevo') update.fecha_email_inicial = hoy

  await updateDoc(doc(db, 'leads', lead.id), update)

  return t.estadoSiguiente
}
