import nodemailer from 'nodemailer'

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(o => o.trim()).filter(Boolean)

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_APP_PASSWORD
  }
})

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { to, subject, body } = req.body || {}

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: 'Email destinatario inválido' })
  }
  if (subject.length > 200 || body.length > 10000) {
    return res.status(400).json({ error: 'Contenido demasiado largo' })
  }

  try {
    await transporter.sendMail({
      from: `"Germán Mardones | BioBio Code" <${process.env.ZOHO_EMAIL}>`,
      to,
      subject,
      text: body
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Email send error:', err)
    return res.status(500).json({ error: 'Error al enviar email' })
  }
}
