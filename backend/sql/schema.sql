-- La base seleccionada debe ser mindbuengob. El backend usa las tablas onlyoffice_* indicadas abajo.


CREATE TABLE `onlyoffice_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `file_type` varchar(12) NOT NULL,
  `storage_path` varchar(1024) NOT NULL,
  `current_version` int unsigned NOT NULL DEFAULT '1',
  `editor_key` varchar(128) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_documents_editor_key` (`editor_key`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `onlyoffice_document_versions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint unsigned NOT NULL,
  `version_number` int unsigned NOT NULL,
  `file_path` varchar(1024) NOT NULL,
  `modified_by` varchar(191) DEFAULT NULL,
  `source` enum('initial','close','forcesave') NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `editor_key` varchar(128) DEFAULT NULL,
  `history_key` varchar(128) DEFAULT NULL,
  `changes_path` varchar(1024) DEFAULT NULL,
  `history_data` json DEFAULT NULL,
  `file_type` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_document_version` (`document_id`,`version_number`),
  CONSTRAINT `fk_versions_document` FOREIGN KEY (`document_id`) REFERENCES `onlyoffice_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `onlyoffice_callbacks` (
  `callback_hash` char(64) NOT NULL,
  `document_id` bigint unsigned NOT NULL,
  `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`callback_hash`),
  KEY `fk_callbacks_document` (`document_id`),
  CONSTRAINT `fk_callbacks_document` FOREIGN KEY (`document_id`) REFERENCES `onlyoffice_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `onlyoffice_document_audit` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint unsigned NOT NULL,
  `modified_by` int DEFAULT NULL,
  `action` varchar(64) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `document_version_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_document_audit_document_date` (`document_id`,`created_at`),
  KEY `idx_document_audit_user` (`modified_by`),
  KEY `idx_document_audit_version` (`document_version_id`),
  CONSTRAINT `fk_document_audit_document` FOREIGN KEY (`document_id`) REFERENCES `onlyoffice_documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;