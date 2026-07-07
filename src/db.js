import mysql from 'mysql2/promise'

let pool

export async function getPool() {
  if (!pool) {
    if (process.env.MYSQL_PUBLIC_URL) {
      pool = mysql.createPool(process.env.MYSQL_PUBLIC_URL)
    } else {
      pool = mysql.createPool({
        host: process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306'),
        user: process.env.MYSQL_USER || process.env.MYSQLUSER || 'root',
        password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'parkingsystem',
      })
    }
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
