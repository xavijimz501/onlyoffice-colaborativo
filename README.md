# Editor colaborativo ONLYOFFICE

Aplicación React/Vite + Express/MySQL. La sincronización del documento y la coedición las realiza ONLYOFFICE Docs; Socket.IO publica la lista de usuarios autenticados que están dentro de cada documento.

## Configuración de base de datos

`usuarios` y `view_usuarios_app_perfiles` se consultan en `AUTH_DB_NAME` (por defecto, `mindbuengob`). Las tablas `documents`, `document_versions`, `onlyoffice_callbacks` y `document_audit` se guardan en `DB_NAME`.

Selecciona `DB_NAME` al ejecutar el esquema. Por ejemplo:

```powershell
mysql -h 127.0.0.1 -u tu_usuario -p onlyoffice_app < backend\sql\schema.sql
```

El script usa `CREATE TABLE IF NOT EXISTS`, por lo que conserva las tablas ya creadas y añade `document_audit`. Haz respaldo antes de aplicar cambios a una base de producción.

## Configurar y levantar

1. ONLYOFFICE Docs debe estar ejecutándose en Docker y compartir su JWT secret con `ONLYOFFICE_JWT_SECRET`.
2. Revisa `backend/.env`. Se requiere `APP_JWT_SECRET` para las sesiones de la aplicación. El proyecto ya agregó uno aleatorio si faltaba. Ajusta `DB_NAME` y `AUTH_DB_NAME` a tus bases, y verifica que `APP_PUBLIC_URL` sea accesible desde el contenedor Document Server.
3. En PowerShell, instala/actualiza dependencias y levanta el backend:

   ```powershell
   cd C:\Users\xavier.jimenez\Documents\Desarrollos\onlyoffice\backend
   npm install
   npm run dev
   ```

4. En otra terminal, levanta Vite:

   ```powershell
   cd C:\Users\xavier.jimenez\Documents\Desarrollos\onlyoffice\frontend
   npm install
   npm run dev
   ```

5. Abre la URL de Vite, inicia sesión con un usuario activo y pulsa **Nuevo documento**. Se copia `DOCUMENT_TEMPLATE_PATH` (por defecto `backend/storage/documentos/demo.docx`) para crear un DOCX nuevo.

## Contraseñas

El login acepta hashes bcrypt almacenados en `usuarios.password`. Si la base aún guarda contraseñas en texto plano, `ALLOW_LEGACY_PLAINTEXT_PASSWORDS=true` activa temporalmente esa compatibilidad; migra los registros a bcrypt y vuelve a ponerlo en `false`. Nunca se devuelve la contraseña ni se consulta el campo `password` de la vista de perfiles.

## Guardado y auditoría

El botón **Guardar** solicita `forcesave` a ONLYOFFICE. Al recibir status 6, el callback guarda el archivo de versión y añade auditoría con el ID de `users[0]` que reporta ONLYOFFICE y fecha `DATETIME(3)`. Status 2 registra también el guardado al cerrar la sesión. La hora se muestra con milisegundos según la zona local del navegador. La ruta `GET /api/documents/:id/audit` devuelve el registro.

La key de ONLYOFFICE se conserva durante force-save para mantener la coedición y se rota después del cierre final. Para colaborar, los participantes deben iniciar sesión y abrir el mismo ID de documento.
