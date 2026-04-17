import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

export default async function handler(req, res) {
  const origin = req.headers.origin || ''

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, company, sector, message, website } = req.body || {}

  // Honeypot: bot filled the field → silent success
  if (website) {
    return res.status(200).json({ ok: true })
  }

  const trimName = (name || '').trim()
  const trimCompany = (company || '').trim()
  const trimMessage = (message || '').trim()

  if (!trimName || trimName.length < 2 || trimName.length > 100) {
    return res.status(400).json({ error: 'Nombre inválido' })
  }
  if (!trimCompany || trimCompany.length < 2 || trimCompany.length > 100) {
    return res.status(400).json({ error: 'Empresa inválida' })
  }
  if (!trimMessage || trimMessage.length < 10 || trimMessage.length > 2000) {
    return res.status(400).json({ error: 'Mensaje inválido' })
  }

  const validSectors = ['industrial', 'logistica', 'activos']
  const safeSector = validSectors.includes(sector) ? sector : 'industrial'

  try {
    await addDoc(collection(db, 'leads'), {
      nombre: trimName,
      empresa: trimCompany,
      sector: safeSector,
      mensaje: trimMessage,
      fuente: 'biobiocode.cl',
      estado: 'nuevo',
      created_at: serverTimestamp()
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Firestore error:', err)
    return res.status(500).json({ error: 'Error al guardar lead' })
  }
}
