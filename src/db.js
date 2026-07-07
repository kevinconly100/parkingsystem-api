import mysql from 'mysql2/promise'

let pool

export async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'admin',
      password: process.env.MYSQL_PASSWORD || 'kevin',
      database: process.env.MYSQL_DATABASE || 'parkingsystem',
      waitForConnections: true,
      connectionLimit: 10,
    })
  }
  return pool
}

export async function initDb() {
  const p = await getPool()
  await p.execute(`
    CREATE TABLE IF NOT EXISTS cars (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plate_number VARCHAR(20) NOT NULL,
      slot_number INT NOT NULL,
      entry_time BIGINT NOT NULL,
      exit_time BIGINT DEFAULT NULL,
      status VARCHAR(10) NOT NULL DEFAULT 'parked'
    )
  `)
}
