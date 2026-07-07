import express from 'express'
import cors from 'cors'
import parkingRoutes from './routes/parking.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: ['http://localhost:5173', 'https://kevinconly100.github.io'],
  methods: ['GET', 'POST', 'DELETE'],
}))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.use('/api', parkingRoutes)

app.listen(PORT, () => {
  console.log(`SmartPark API running on http://localhost:${PORT}`)
})
