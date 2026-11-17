require('dotenv').config();
const pool = require('../src/config/database');

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  if (!rows[0].total) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`Agregada columna ${table}.${column}`);
  }
}

async function ensureIndex(table, index, columns) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, index],
  );
  if (!rows[0].total) await pool.query(`ALTER TABLE \`${table}\` ADD INDEX \`${index}\` (${columns})`);
}

async function migrate() {
  await ensureColumn('onlyoffice_document_versions', 'editor_key', 'varchar(128) DEFAULT NULL');
  await ensureColumn('onlyoffice_document_versions', 'history_key', 'varchar(128) DEFAULT NULL');
  await ensureColumn('onlyoffice_document_versions', 'changes_path', 'varchar(1024) DEFAULT NULL');
  await ensureColumn('onlyoffice_document_versions', 'history_data', 'json DEFAULT NULL');
  await ensureColumn('onlyoffice_document_versions', 'file_type', 'varchar(12) DEFAULT NULL');
  await ensureColumn('onlyoffice_document_audit', 'document_version_id', 'bigint unsigned DEFAULT NULL');
  await ensureIndex('onlyoffice_document_audit', 'idx_document_audit_version', '`document_version_id`');
  await pool.execute(
    `UPDATE onlyoffice_document_versions v
     INNER JOIN onlyoffice_documents d ON d.id = v.document_id
     SET v.editor_key = COALESCE(v.editor_key, d.editor_key),
         v.history_key = COALESCE(v.history_key, v.editor_key, d.editor_key),
         v.file_type = COALESCE(v.file_type, d.file_type)
     WHERE v.source = 'initial'`,
  );
  console.log(`Migración de historial lista en ${process.env.DB_NAME}.`);
}

migrate().catch((error) => {
  console.error('No se pudo migrar el historial:', error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
