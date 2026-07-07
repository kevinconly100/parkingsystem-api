import mysql from 'mysql2/promise'

let pool

function getConfig() {
  if (process.env.MYSQL_PUBLIC_URL) {
    return { uri: process.env.MYSQL_PUBLIC_URL, ssl: {} }
  }
  return {
    host: process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306'),
    user: process.env.MYSQL_USER || process.env.MYSQLUSER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'parkingsystem',
    ssl: process.env.MYSQL_PUBLIC_URL ? {} : undefined,
  }
}

export async function getPool() {
  if (!pool) {
    const cfg = getConfig()
    if (cfg.uri) {
      pool = mysql.createPool(cfg.uri)
    } else {
      pool = mysql.createPool({
        ...cfg,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 10000,
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
