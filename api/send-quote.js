import nodemailer from 'nodemailer'

/**
 * POST /api/send-quote
 * Body: { to, subject, html, pdfBase64? (optional), pdfFilename? }
 *
 * Requires env vars:
 *   ZOHO_EMAIL          — sender email
 *   ZOHO_APP_PASSWORD   — Zoho app-specific password
 *   ALLOWED_ORIGINS     — comma-separated list (same as /api/leads.js)
 *
 * Returns: { ok: true } or { error }
 */

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

export default async function handler(req, res) {
  const origin = req.headers.origin || ''

  // Allow same-origin requests in addition to whitelisted production origins
  if (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost')) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { to, subject, html, text, pdfBase64, pdfFilename } = req.body || {}

  if (!to || !subject || !(html || text)) {
    return res.status(400).json({ error: 'Faltan campos: to, subject, html/text' })
  }
  if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_APP_PASSWORD) {
    return res.status(500).json({ error: 'Credenciales SMTP no configuradas en el servidor' })
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_APP_PASSWORD
    }
  })

  const attachments = []
  if (pdfBase64) {
    attachments.push({
      filename: pdfFilename || 'cotizacion.pdf',
      content: pdfBase64.replace(/^data:application\/pdf;base64,/, ''),
      encoding: 'base64',
      contentType: 'application/pdf'
    })
  }

  try {
    await transporter.sendMail({
      from: `"BioBio Code" <${process.env.ZOHO_EMAIL}>`,
      to,
      subject,
      html: html || undefined,
      text: text || undefined,
      attachments
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('send-quote error', err)
    return res.status(500).json({ error: err.message || 'Error enviando email' })
  }
}
