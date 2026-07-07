import app from '../src/index.js'
import { initDb } from '../src/db.js'

let initialized = false

export default async function handler(req, res) {
  if (!initialized) {
    try {
      await initDb()
      initialized = true
    } catch (err) {
      res.status(500).json({ success: false, message: 'DB init failed: ' + err.message })
      return
    }
  }
  return app(req, res)
}
