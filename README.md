# Editor colaborativo ONLYOFFICE

Aplicación React/Vite + Express/MySQL. La sincronización del documento y la coedición las realiza ONLYOFFICE Docs; Socket.IO publica la lista de usuarios autenticados que están dentro de cada documento.

## Configuración de base de datos

La aplicación usa `mindbuengob` para autenticación y documentos. Lee `usuarios` y `view_usuarios_app_perfiles`; las tablas colaborativas son `onlyoffice_documents`, `onlyoffice_document_versions`, `onlyoffice_document_audit` y `onlyoffice_callbacks`.

Si necesitas crear estas tablas desde cero, selecciona `mindbuengob` al ejecutar el esquema. Como ya las agregaste, no vuelvas a ejecutar el script de creación. El backend se conecta a `mindbuengob` mediante `DB_NAME`.

```powershell
mysql -h 127.0.0.1 -u tu_usuario -p mindbuengob < backend\sql\schema.sql
```

El archivo `backend/sql/schema.sql` es una referencia de la estructura requerida. Para registrar usuarios, MySQL debe permitir leer las tablas de aplicación y la vista de perfiles en `mindbuengob`.

## Configurar y levantar

1. ONLYOFFICE Docs debe estar ejecutándose en Docker y compartir su JWT secret con `ONLYOFFICE_JWT_SECRET`.
2. Revisa `backend/.env`. `DB_NAME` y `AUTH_DB_NAME` deben ser `mindbuengob`. Se requiere `APP_JWT_SECRET` para las sesiones de la aplicación. Verifica que `APP_PUBLIC_URL` sea accesible desde el contenedor Document Server.
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

## Perfiles local y productivo

Los archivos `backend/.env`, `frontend/.env` y `docker/.env` son locales y están excluidos de Git. Los ejemplos seguros están en `.env.example`. En los `.env` comenta el bloque del perfil que no uses y deja activo solo uno. El bloque productivo usa `/onlyoffice` para la aplicación y la URL de la API; cambia a ese perfil antes de construir el frontend.

Para producción, `APP_PUBLIC_URL` y `VITE_API_URL` deben ser `https://upsrc.buengobierno.gob.mx/onlyoffice` (sin `/api` al final): el backend y el frontend agregan `/api` a sus rutas. `APP_BASE_PATH=/onlyoffice` hace que Express acepte el prefijo externo. Configura el proxy para preservar ese prefijo hacia Node y habilitar WebSocket en `/onlyoffice/api/socket.io`. Sirve `frontend/dist` bajo `/onlyoffice/`. Configura `HOST=127.0.0.1` para que Node solo acepte conexiones del proxy local.

El bloque de producción presupone que la aplicación y su API estarán bajo `/onlyoffice/`, y ONLYOFFICE Document Server bajo `https://upsrc.buengobierno.gob.mx/onlyoffice-docs/`. Usa prefijos distintos en Nginx para evitar colisiones. Envía `/onlyoffice-docs/` al Document Server en `127.0.0.1:8088`, junto con sus recursos `/web-apps/` y rutas versionadas; envía `/onlyoffice/` al frontend y `/onlyoffice/api/` a Express, incluyendo WebSocket para `/onlyoffice/api/socket.io`. Si el Document Server tendrá otro host, cambia `ONLYOFFICE_URL` en `backend/.env` y `VITE_SOCKET_URL`/`FRONTEND_ORIGIN` según el despliegue.

En `docker/.env`, `ONLYOFFICE_JWT_SECRET` debe coincidir exactamente con el del backend. Para el proxy TLS productivo, deja el contenedor ligado a `127.0.0.1:8088` y `127.0.0.1:8443`; el proxy debe enviar el tráfico público HTTPS de Document Server al puerto HTTP 8088 e incluir los encabezados `Host`, `X-Forwarded-Host` y `X-Forwarded-Proto`, además de permitir WebSocket. Desde `docker/`, usa `docker compose up -d`; el Compose contiene solo Document Server, no crea una base MySQL. El archivo conserva el tag previo `latest`; para producción fija el tag exacto de la versión que validaste.

El usuario MySQL productivo necesita conectividad de red desde el servidor de Node hacia el host configurado, permisos sobre `mindbuengob` y lectura de `usuarios`/`view_usuarios_app_perfiles`. Con el perfil productivo activo, ejecuta una vez `npm run migrate:history` desde `backend/` para añadir columnas de historial si aún no existen y después inicia con `npm start`. No uses las credenciales productivas en un `.env` que se vaya a versionar; `.gitignore` excluye los `.env` y conserva sus ejemplos.

## Contraseñas

El login acepta hashes bcrypt almacenados en `usuarios.password`. Si la base aún guarda contraseñas en texto plano, `ALLOW_LEGACY_PLAINTEXT_PASSWORDS=true` activa temporalmente esa compatibilidad; migra los registros a bcrypt y vuelve a ponerlo en `false`. Nunca se devuelve la contraseña ni se consulta el campo `password` de la vista de perfiles.

## Guardado y auditoría

El botón **Guardar** solicita `forcesave` a ONLYOFFICE. Al recibir status 6, el callback guarda el archivo de versión y añade auditoría con el ID de `users[0]` que reporta ONLYOFFICE y fecha `DATETIME(3)`. Status 2 registra también el guardado al cerrar la sesión. La hora se muestra con milisegundos según la zona local del navegador. La ruta `GET /api/documents/:id/audit` devuelve el registro.

La key de ONLYOFFICE se conserva durante force-save para mantener la coedición y se rota después del cierre final. Para colaborar, los participantes deben iniciar sesión y abrir el mismo ID de documento.
