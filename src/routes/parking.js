import { Router } from 'express'
import { getPool } from '../db.js'

const router = Router()

const TOTAL_SLOTS = 15
const HOURLY_RATE_FIRST_HOUR = 500
const HOURLY_RATE_ADDITIONAL = 300
const ONE_HOUR_MS = 60 * 60 * 1000
const PLATE_REGEX = /^RA[BCDEFGHJKLNPSTVZ]\d{3}[A-Z]$/

async function getOccupiedSlots() {
  const pool = await getPool()
  const [rows] = await pool.execute(
    "SELECT slot_number FROM cars WHERE status = 'parked'"
  )
  return new Set(rows.map(r => r.slot_number))
}

router.get('/lot', async (req, res) => {
  try {
    const pool = await getPool()
    const [rows] = await pool.execute(
      "SELECT * FROM cars WHERE status = 'parked' ORDER BY slot_number ASC"
    )
    const slots = new Array(TOTAL_SLOTS).fill(null)
    for (const car of rows) {
      slots[car.slot_number - 1] = {
        plateNumber: car.plate_number,
        slotNumber: car.slot_number,
        entryTime: car.entry_time,
      }
    }
    res.json({ slots })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.post('/park', async (req, res) => {
  try {
    const { plateNumber, slotNumber } = req.body
    const plate = plateNumber?.trim().toUpperCase()

    if (!plate) {
      return res.status(400).json({ success: false, message: 'Please enter a plate number.' })
    }
    if (!PLATE_REGEX.test(plate)) {
      return res.status(400).json({ success: false, message: 'Invalid plate format. Example: RAC123A' })
    }

    const pool = await getPool()
    const [existing] = await pool.execute(
      "SELECT id FROM cars WHERE plate_number = ? AND status = 'parked'",
      [plate]
    )
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `Car "${plate}" is already parked.` })
    }

    const occupied = await getOccupiedSlots()
    if (occupied.size >= TOTAL_SLOTS) {
      return res.status(409).json({ success: false, message: 'Parking lot is full!' })
    }

    let slot = parseInt(slotNumber, 10)
    if (slotNumber && !isNaN(slot) && slot >= 1 && slot <= TOTAL_SLOTS) {
      if (occupied.has(slot)) {
        return res.status(409).json({ success: false, message: `Slot ${slot} is already occupied.` })
      }
    } else {
      for (let i = 1; i <= TOTAL_SLOTS; i++) {
        if (!occupied.has(i)) { slot = i; break }
      }
    }

    const entryTime = Date.now()
    await pool.execute(
      "INSERT INTO cars (plate_number, slot_number, entry_time) VALUES (?, ?, ?)",
      [plate, slot, entryTime]
    )

    res.json({
      success: true,
      message: `Car "${plate}" parked in slot ${slot}.`,
      car: { plateNumber: plate, slotNumber: slot, entryTime },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.delete('/remove', async (req, res) => {
  try {
    const { plateNumber } = req.body
    const plate = plateNumber?.trim().toUpperCase()

    if (!plate) {
      return res.status(400).json({ success: false, message: 'Enter plate number to remove.' })
    }

    const pool = await getPool()
    const [cars] = await pool.execute(
      "SELECT * FROM cars WHERE plate_number = ? AND status = 'parked'",
      [plate]
    )
    if (cars.length === 0) {
      return res.status(404).json({ success: false, message: `Car "${plate}" not found.` })
    }

    const car = cars[0]
    const exitTime = Date.now()
    const duration = exitTime - car.entry_time

    let bill = HOURLY_RATE_FIRST_HOUR
    const remaining = duration - ONE_HOUR_MS
    if (remaining > 0) {
      bill += Math.ceil(remaining / ONE_HOUR_MS) * HOURLY_RATE_ADDITIONAL
    }

    await pool.execute(
      "UPDATE cars SET status = 'exited', exit_time = ? WHERE id = ?",
      [exitTime, car.id]
    )

    res.json({
      success: true,
      message: `Car "${plate}" removed. Time: ${formatDuration(duration)}. Bill: Rwf ${bill.toLocaleString()}.`,
      bill,
      duration,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.delete('/clear', async (req, res) => {
  try {
    const pool = await getPool()
    await pool.execute(
      "UPDATE cars SET status = 'exited', exit_time = ? WHERE status = 'parked'",
      [Date.now()]
    )
    res.json({ success: true, message: 'All slots cleared.' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

function formatDuration(ms) {
  if (ms < 0) ms = 0
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map(u => u.toString().padStart(2, '0')).join(':')
}

export default router
