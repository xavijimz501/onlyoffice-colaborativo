const pool = require('../config/database');
const authDatabase = process.env.AUTH_DB_NAME || process.env.DB_NAME;
if (!/^[A-Za-z0-9_]+$/.test(authDatabase || '')) throw new Error('AUTH_DB_NAME contiene caracteres inválidos.');
const usersTable = `\`${authDatabase}\`.\`usuarios\``;

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM onlyoffice_documents WHERE id = ?', [id]);
  return rows[0] || null;
}

async function listDocuments() {
  const [rows] = await pool.execute(
    'SELECT id, title, current_version, updated_at FROM onlyoffice_documents ORDER BY updated_at DESC, id DESC',
  );
  return rows;
}

async function findByEditorKey(key) {
  const [rows] = await pool.execute('SELECT * FROM onlyoffice_documents WHERE editor_key = ?', [key]);
  return rows[0] || null;
}

async function listVersions(documentId) {
  const [rows] = await pool.execute(
    'SELECT version_number, modified_by, source, created_at FROM onlyoffice_document_versions WHERE document_id = ? ORDER BY version_number DESC',
    [documentId],
  );
  return rows;
}

async function listAudit(documentId) {
  const [rows] = await pool.execute(
    `SELECT a.id, a.action, a.created_at, a.modified_by AS idusuario,
            COALESCE(u.nombre, IF(a.modified_by IS NULL, 'Sistema', CONCAT('Usuario ', a.modified_by))) AS nombre,
            u.correo, v.version_number, v.source,
            CASE WHEN v.source IN ('close', 'forcesave') AND v.changes_path IS NOT NULL
                 THEN v.version_number ELSE NULL END AS history_version
     FROM onlyoffice_document_audit a
     LEFT JOIN ${usersTable} u ON u.idusuario = a.modified_by
     LEFT JOIN onlyoffice_document_versions v ON v.id = a.document_version_id
     WHERE a.document_id = ? ORDER BY a.created_at DESC, a.id DESC`,
    [documentId],
  );
  return rows;
}

async function listHistoryVersions(documentId) {
  const [rows] = await pool.execute(
    `SELECT v.id, v.version_number, v.file_path, v.file_type, v.editor_key, v.history_key, v.modified_by,
            v.created_at, v.source, v.changes_path, v.history_data,
            COALESCE(u.nombre, IF(v.modified_by IS NULL, 'Sistema', CONCAT('Usuario ', v.modified_by))) AS modified_name
     FROM onlyoffice_document_versions v
     LEFT JOIN ${usersTable} u ON u.idusuario = v.modified_by
     WHERE v.document_id = ?
       AND (v.source IN ('initial', 'close') OR (v.source = 'forcesave' AND v.changes_path IS NOT NULL))
     ORDER BY version_number ASC`,
    [documentId],
  );
  return rows;
}

async function findHistoryVersion(documentId, versionNumber) {
  const [rows] = await pool.execute(
    `SELECT v.id, v.version_number, v.file_path, v.file_type, v.editor_key, v.history_key, v.modified_by,
            v.created_at, v.source, v.changes_path, v.history_data,
            COALESCE(u.nombre, IF(v.modified_by IS NULL, 'Sistema', CONCAT('Usuario ', v.modified_by))) AS modified_name
     FROM onlyoffice_document_versions v
     LEFT JOIN ${usersTable} u ON u.idusuario = v.modified_by
     WHERE v.document_id = ? AND v.version_number = ?
       AND (v.source IN ('initial', 'close') OR (v.source = 'forcesave' AND v.changes_path IS NOT NULL))
     LIMIT 1`,
    [documentId, versionNumber],
  );
  return rows[0] || null;
}

async function findPreviousHistoryVersion(documentId, versionNumber) {
  const [rows] = await pool.execute(
    `SELECT id, version_number, file_path, file_type, editor_key, history_key
     FROM onlyoffice_document_versions
     WHERE document_id = ? AND version_number < ?
       AND (source IN ('initial', 'close') OR (source = 'forcesave' AND changes_path IS NOT NULL))
     ORDER BY version_number DESC LIMIT 1`,
    [documentId, versionNumber],
  );
  return rows[0] || null;
}

async function findHistoryFile(documentId, versionNumber, kind) {
  const column = kind === 'changes' ? 'changes_path' : 'file_path';
  const [rows] = await pool.execute(
    `SELECT ${column} AS file_path, file_type FROM onlyoffice_document_versions
     WHERE document_id = ? AND version_number = ? LIMIT 1`,
    [documentId, versionNumber],
  );
  return rows[0] || null;
}

async function createDocument({ title, filePath, editorKey, userId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO onlyoffice_documents (title, file_type, storage_path, current_version, editor_key)
       VALUES (?, 'docx', ?, 1, ?)`,
      [title, filePath, editorKey],
    );
    const [versionResult] = await connection.execute(
      `INSERT INTO onlyoffice_document_versions
       (document_id, version_number, file_path, modified_by, source, editor_key, history_key, file_type)
       VALUES (?, 1, ?, ?, 'initial', ?, ?, 'docx')`,
      [result.insertId, filePath, userId, editorKey, editorKey],
    );
    await connection.execute(
      'INSERT INTO onlyoffice_document_audit (document_id, modified_by, action, document_version_id) VALUES (?, ?, ?, ?)',
      [result.insertId, userId, 'document_created', versionResult.insertId],
    );
    await connection.commit();
    return { id: result.insertId };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

async function recordVersion({ documentId, filePath, modifiedBy, source, callbackHash, editorKey, changesPath, historyData, fileType }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute('SELECT callback_hash FROM onlyoffice_callbacks WHERE callback_hash = ? FOR UPDATE', [callbackHash]);
    if (existing.length) { await connection.rollback(); return { duplicate: true }; }
    const [docs] = await connection.execute('SELECT current_version FROM onlyoffice_documents WHERE id = ? FOR UPDATE', [documentId]);
    if (!docs.length) throw new Error('Documento inexistente durante el guardado.');
    const [duplicateAfterLock] = await connection.execute('SELECT callback_hash FROM onlyoffice_callbacks WHERE callback_hash = ? FOR UPDATE', [callbackHash]);
    if (duplicateAfterLock.length) { await connection.rollback(); return { duplicate: true }; }

    if (source === 'close') {
      const [forceSaves] = await connection.execute(
        `SELECT id, version_number, file_path
         FROM onlyoffice_document_versions
         WHERE document_id = ? AND editor_key = ? AND source = 'forcesave'
         ORDER BY version_number DESC LIMIT 1 FOR UPDATE`,
        [documentId, editorKey],
      );
      if (forceSaves.length) {
        const previousSave = forceSaves[0];
        const historyKey = `doc-${documentId}-v${previousSave.version_number}-${Date.now()}`;
        await connection.execute(
          `UPDATE onlyoffice_document_versions
           SET file_path = ?, modified_by = ?, source = 'close', history_key = ?, changes_path = ?,
               history_data = ?, file_type = ?, created_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [filePath, modifiedBy, historyKey, changesPath, historyData, fileType, previousSave.id],
        );
        await connection.execute(
          `UPDATE onlyoffice_document_audit
           SET modified_by = ?, action = 'Modificó el archivo', created_at = CURRENT_TIMESTAMP(3)
           WHERE document_version_id = ?`,
          [modifiedBy, previousSave.id],
        );
        await connection.execute('INSERT INTO onlyoffice_callbacks (callback_hash, document_id) VALUES (?, ?)', [callbackHash, documentId]);
        await connection.execute(
          'UPDATE onlyoffice_documents SET editor_key = ?, storage_path = ? WHERE id = ?',
          [historyKey, filePath, documentId],
        );
        await connection.commit();
        return {
          duplicate: false,
          merged: true,
          versionNumber: previousSave.version_number,
          previousFilePath: previousSave.file_path,
        };
      }
    }

    const versionNumber = docs[0].current_version + 1;
    const nextHistoryKey = `doc-${documentId}-v${versionNumber}-${Date.now()}`;
    const [versionResult] = await connection.execute(
      `INSERT INTO onlyoffice_document_versions
       (document_id, version_number, file_path, modified_by, source, editor_key, history_key, changes_path, history_data, file_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [documentId, versionNumber, filePath, modifiedBy, source, editorKey, nextHistoryKey, changesPath, historyData, fileType],
    );
    await connection.execute('UPDATE onlyoffice_documents SET current_version = ? WHERE id = ?', [versionNumber, documentId]);
    await connection.execute('INSERT INTO onlyoffice_callbacks (callback_hash, document_id) VALUES (?, ?)', [callbackHash, documentId]);
    await connection.execute(
      'INSERT INTO onlyoffice_document_audit (document_id, modified_by, action, document_version_id) VALUES (?, ?, ?, ?)',
      [documentId, modifiedBy, 'Modificó el archivo', versionResult.insertId],
    );
    if (source === 'close') {
      await connection.execute('UPDATE onlyoffice_documents SET editor_key = ?, storage_path = ? WHERE id = ?', [nextHistoryKey, filePath, documentId]);
    }
    await connection.commit();
    return { duplicate: false, versionNumber };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

module.exports = {
  findById, findByEditorKey, listDocuments, listAudit, listVersions,
  listHistoryVersions, findHistoryVersion, findPreviousHistoryVersion, findHistoryFile,
  createDocument, recordVersion,
};
