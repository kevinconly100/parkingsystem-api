import express from 'express'
import cors from 'cors'
import parkingRoutes from './routes/parking.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api', parkingRoutes)

app.listen(PORT, () => {
  console.log(`SmartPark API running on http://localhost:${PORT}`)
})
