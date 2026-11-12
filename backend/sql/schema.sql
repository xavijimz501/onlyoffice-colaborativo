-- Ejecuta este archivo con la base que usarás para documents/versiones/auditoría seleccionada.
CREATE TABLE IF NOT EXISTS documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  file_type VARCHAR(12) NOT NULL,
  storage_path VARCHAR(1024) NOT NULL,
  current_version INT UNSIGNED NOT NULL DEFAULT 1,
  editor_key VARCHAR(128) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_documents_editor_key (editor_key)
);

CREATE TABLE IF NOT EXISTS document_versions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  document_id BIGINT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  file_path VARCHAR(1024) NOT NULL,
  modified_by VARCHAR(191) NULL,
  source ENUM('initial', 'close', 'forcesave') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_document_version (document_id, version_number),
  CONSTRAINT fk_versions_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS onlyoffice_callbacks (
  callback_hash CHAR(64) NOT NULL PRIMARY KEY,
  document_id BIGINT UNSIGNED NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_callbacks_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  document_id BIGINT UNSIGNED NOT NULL,
  modified_by INT NULL,
  action VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_document_audit_document_date (document_id, created_at),
  KEY idx_document_audit_user (modified_by),
  CONSTRAINT fk_document_audit_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
