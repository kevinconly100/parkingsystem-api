import app from '../src/index.js'
import { initDb } from '../src/db.js'

export default async function handler(req, res) {
  try {
    await initDb()
    return app(req, res)
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database connection failed: ' + err.message })
  }
}
