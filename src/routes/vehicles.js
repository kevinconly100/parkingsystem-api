import { Router } from 'express'
import { getPool } from '../db.js'

const router = Router()

const PLATE_REGEX = /^RA[BCDEFGHJKLNPSTVZ]\d{3}[A-Z]$/

// Register a new vehicle
router.post('/register', async (req, res) => {
  try {
    const { plateNumber, ownerName, phone, email, model, color } = req.body
    const plate = plateNumber?.trim().toUpperCase()

    if (!plate || !PLATE_REGEX.test(plate)) {
      return res.status(400).json({
        success: false,
        message: 'Valid plate number required (e.g., RAC123A).',
      })
    }

    const pool = await getPool()
    const now = Date.now()

    const [existing] = await pool.execute(
      'SELECT id FROM vehicles WHERE plate_number = ?',
      [plate]
    )
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `Vehicle "${plate}" is already registered.` })
    }

    await pool.execute(
      'INSERT INTO vehicles (plate_number, owner_name, phone, email, model, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [plate, ownerName || '', phone || '', email || '', model || '', color || '', now, now]
    )

    res.json({
      success: true,
      message: `Vehicle "${plate}" registered successfully.`,
      vehicle: { plateNumber: plate, ownerName, phone, email, model, color },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Get vehicle details
router.get('/:plate', async (req, res) => {
  try {
    const plate = req.params.plate?.toUpperCase()

    const pool = await getPool()
    const [rows] = await pool.execute(
      'SELECT * FROM vehicles WHERE plate_number = ?',
      [plate]
    )
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Vehicle "${plate}" not found.` })
    }

    const v = rows[0]
    res.json({
      success: true,
      vehicle: {
        plateNumber: v.plate_number,
        ownerName: v.owner_name,
        phone: v.phone,
        email: v.email,
        model: v.model,
        color: v.color,
        createdAt: v.created_at,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// List all registered vehicles
router.get('/', async (req, res) => {
  try {
    const pool = await getPool()
    const [rows] = await pool.execute(
      'SELECT * FROM vehicles ORDER BY created_at DESC'
    )

    res.json({
      success: true,
      vehicles: rows.map(v => ({
        plateNumber: v.plate_number,
        ownerName: v.owner_name,
        phone: v.phone,
        email: v.email,
        model: v.model,
        color: v.color,
        createdAt: v.created_at,
      })),
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// Get parking history for a vehicle
router.get('/:plate/history', async (req, res) => {
  try {
    const plate = req.params.plate?.toUpperCase()

    const pool = await getPool()
    const [rows] = await pool.execute(
      "SELECT * FROM parking_log WHERE plate_number = ? ORDER BY entry_time DESC",
      [plate]
    )

    res.json({
      success: true,
      history: rows.map(r => ({
        id: r.id,
        slotNumber: r.slot_number,
        entryTime: r.entry_time,
        exitTime: r.exit_time,
        status: r.status,
      })),
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

export default router
