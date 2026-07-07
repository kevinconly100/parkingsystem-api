import { Router } from 'express'
import db from '../db.js'

const router = Router()

const TOTAL_SLOTS = 15
const HOURLY_RATE_FIRST_HOUR = 500
const HOURLY_RATE_ADDITIONAL = 300
const ONE_HOUR_MS = 60 * 60 * 1000
const PLATE_REGEX = /^RA[BCDEFGHJKLNPSTVZ]\d{3}[A-Z]$/

function getParkedCars() {
  return db.prepare("SELECT * FROM cars WHERE status = 'parked' ORDER BY slot_number ASC").all()
}

function getOccupiedSlots() {
  const rows = db.prepare("SELECT slot_number FROM cars WHERE status = 'parked'").all()
  return new Set(rows.map(r => r.slot_number))
}

router.get('/lot', (req, res) => {
  const parked = getParkedCars()
  const slots = new Array(TOTAL_SLOTS).fill(null)
  for (const car of parked) {
    slots[car.slot_number - 1] = {
      plateNumber: car.plate_number,
      slotNumber: car.slot_number,
      entryTime: car.entry_time,
    }
  }
  res.json({ slots })
})

router.post('/park', (req, res) => {
  const { plateNumber, slotNumber } = req.body
  const plate = plateNumber?.trim().toUpperCase()

  if (!plate) {
    return res.status(400).json({ success: false, message: 'Please enter a plate number.' })
  }
  if (!PLATE_REGEX.test(plate)) {
    return res.status(400).json({ success: false, message: 'Invalid plate format. Example: RAC123A' })
  }

  const existing = db.prepare(
    "SELECT id FROM cars WHERE plate_number = ? AND status = 'parked'"
  ).get(plate)
  if (existing) {
    return res.status(409).json({ success: false, message: `Car "${plate}" is already parked.` })
  }

  const occupied = getOccupiedSlots()
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
  db.prepare(
    "INSERT INTO cars (plate_number, slot_number, entry_time) VALUES (?, ?, ?)"
  ).run(plate, slot, entryTime)

  const car = { plateNumber: plate, slotNumber: slot, entryTime }
  res.json({ success: true, message: `Car "${plate}" parked in slot ${slot}.`, car })
})

router.delete('/remove', (req, res) => {
  const { plateNumber } = req.body
  const plate = plateNumber?.trim().toUpperCase()

  if (!plate) {
    return res.status(400).json({ success: false, message: 'Enter plate number to remove.' })
  }

  const car = db.prepare(
    "SELECT * FROM cars WHERE plate_number = ? AND status = 'parked'"
  ).get(plate)
  if (!car) {
    return res.status(404).json({ success: false, message: `Car "${plate}" not found.` })
  }

  const exitTime = Date.now()
  const duration = exitTime - car.entry_time

  let bill = HOURLY_RATE_FIRST_HOUR
  const remaining = duration - ONE_HOUR_MS
  if (remaining > 0) {
    bill += Math.ceil(remaining / ONE_HOUR_MS) * HOURLY_RATE_ADDITIONAL
  }

  db.prepare(
    "UPDATE cars SET status = 'exited', exit_time = ? WHERE id = ?"
  ).run(exitTime, car.id)

  res.json({
    success: true,
    message: `Car "${plate}" removed. Time: ${formatDuration(duration)}. Bill: Rwf ${bill.toLocaleString()}.`,
    bill,
    duration,
  })
})

router.delete('/clear', (req, res) => {
  db.prepare("UPDATE cars SET status = 'exited', exit_time = ? WHERE status = 'parked'").run(Date.now())
  res.json({ success: true, message: 'All slots cleared.' })
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
