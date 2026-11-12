require('dotenv').config();

const mysql = require('mysql2/promise');
const database = process.argv[2] || process.env.DB_NAME;
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database,
  waitForConnections: true,
  connectionLimit: 1,
});

async function migrateAuditTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS document_audit (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      document_id BIGINT UNSIGNED NOT NULL,
      modified_by INT NULL,
      action VARCHAR(64) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_document_audit_document_date (document_id, created_at),
      KEY idx_document_audit_user (modified_by),
      CONSTRAINT fk_document_audit_document
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
  const [rows] = await pool.execute("SHOW TABLES LIKE 'document_audit'");
  if (!rows.length) throw new Error('MySQL no confirmó la creación de document_audit.');
  console.log(`Tabla document_audit lista en ${database}.`);
}

migrateAuditTable()
  .catch((error) => {
    console.error(`No se pudo crear document_audit: ${error.code || error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
