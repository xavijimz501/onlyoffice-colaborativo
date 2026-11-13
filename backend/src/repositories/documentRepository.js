const pool = require('../config/database');
const authDatabase = process.env.AUTH_DB_NAME || process.env.DB_NAME;
if (!/^[A-Za-z0-9_]+$/.test(authDatabase || '')) throw new Error('AUTH_DB_NAME contiene caracteres inválidos.');
const usersTable = `\`${authDatabase}\`.\`usuarios\``;

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [id]);
  return rows[0] || null;
}

async function listDocuments() {
  const [rows] = await pool.execute(
    'SELECT id, title, current_version, updated_at FROM documents ORDER BY updated_at DESC, id DESC',
  );
  return rows;
}

async function findByEditorKey(key) {
  const [rows] = await pool.execute('SELECT * FROM documents WHERE editor_key = ?', [key]);
  return rows[0] || null;
}

async function listVersions(documentId) {
  const [rows] = await pool.execute(
    'SELECT version_number, modified_by, source, created_at FROM document_versions WHERE document_id = ? ORDER BY version_number DESC',
    [documentId],
  );
  return rows;
}

async function listAudit(documentId) {
  const [rows] = await pool.execute(
    `SELECT a.id, a.action, a.created_at, a.modified_by AS idusuario,
            COALESCE(u.nombre, IF(a.modified_by IS NULL, 'Sistema', CONCAT('Usuario ', a.modified_by))) AS nombre,
            u.correo
     FROM document_audit a
     LEFT JOIN ${usersTable} u ON u.idusuario = a.modified_by
     WHERE a.document_id = ? ORDER BY a.created_at DESC, a.id DESC`,
    [documentId],
  );
  return rows;
}

async function createDocument({ title, filePath, editorKey, userId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO documents (title, file_type, storage_path, current_version, editor_key)
       VALUES (?, 'docx', ?, 1, ?)`,
      [title, filePath, editorKey],
    );
    await connection.execute(
      `INSERT INTO document_versions (document_id, version_number, file_path, modified_by, source)
       VALUES (?, 1, ?, ?, 'initial')`,
      [result.insertId, filePath, userId],
    );
    await connection.execute(
      'INSERT INTO document_audit (document_id, modified_by, action) VALUES (?, ?, ?)',
      [result.insertId, userId, 'document_created'],
    );
    await connection.commit();
    return { id: result.insertId };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

async function recordVersion({ documentId, filePath, modifiedBy, source, callbackHash }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute('SELECT id FROM onlyoffice_callbacks WHERE callback_hash = ? FOR UPDATE', [callbackHash]);
    if (existing.length) { await connection.rollback(); return { duplicate: true }; }
    const [docs] = await connection.execute('SELECT current_version FROM documents WHERE id = ? FOR UPDATE', [documentId]);
    if (!docs.length) throw new Error('Documento inexistente durante el guardado.');
    const [duplicateAfterLock] = await connection.execute('SELECT id FROM onlyoffice_callbacks WHERE callback_hash = ? FOR UPDATE', [callbackHash]);
    if (duplicateAfterLock.length) { await connection.rollback(); return { duplicate: true }; }
    const versionNumber = docs[0].current_version + 1;
    await connection.execute('INSERT INTO document_versions (document_id, version_number, file_path, modified_by, source) VALUES (?, ?, ?, ?, ?)', [documentId, versionNumber, filePath, modifiedBy, source]);
    await connection.execute('UPDATE documents SET current_version = ? WHERE id = ?', [versionNumber, documentId]);
    await connection.execute('INSERT INTO onlyoffice_callbacks (callback_hash, document_id) VALUES (?, ?)', [callbackHash, documentId]);
    await connection.execute(
      'INSERT INTO document_audit (document_id, modified_by, action) VALUES (?, ?, ?)',
      [documentId, modifiedBy, 'Modificó el archivo'],
    );
    if (source === 'close') {
      const newKey = `doc-${documentId}-v${versionNumber}-${Date.now()}`;
      await connection.execute('UPDATE documents SET editor_key = ?, storage_path = ? WHERE id = ?', [newKey, filePath, documentId]);
    }
    await connection.commit();
    return { duplicate: false, versionNumber };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

module.exports = { findById, findByEditorKey, listDocuments, listAudit, listVersions, createDocument, recordVersion };
