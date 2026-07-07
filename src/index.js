import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env') })
import express from 'express'
import cors from 'cors'
import parkingRoutes from './routes/parking.js'
import { initDb } from './db.js'

const app = express()

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://kevinconly100.github.io',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  methods: ['GET', 'POST', 'DELETE'],
}))

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.use('/api', parkingRoutes)

// Start server if run directly (not on Vercel)
const isVercel = process.env.VERCEL
if (!isVercel) {
  const PORT = process.env.PORT || 3001
  initDb()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`SmartPark API running on http://localhost:${PORT}`)
      })
    })
    .catch(err => {
      console.error('Database init failed:', err)
      process.exit(1)
    })
}

export default app
