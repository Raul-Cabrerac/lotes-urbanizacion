# Base de datos: PostgreSQL en Neon

Guía para los integrantes del grupo. Léela entera antes del primer `npm run dev`.

## 1. Cómo funciona

- La aplicación usa **PostgreSQL en [Neon](https://neon.com)**, un servicio en la nube (servidor
  en São Paulo). Nadie instala PostgreSQL en su máquina.
- El proyecto de Neon tiene **ramas**. Una rama es una copia completa e independiente de la base,
  como una rama de git pero de datos:
  - `production`: los datos que se muestran al docente. No se usa para practicar.
  - `dev-<tu-nombre>`: tu rama personal. Nace como copia de `production`; lo que hagas en ella no
    afecta a los demás.
- Tu conexión va en el archivo `.env.local` de la raíz del repositorio (no se sube a git):
  - `DATABASE_URL`: pasa por el pooler de Neon. La usa la aplicación.
  - `DATABASE_URL_UNPOOLED`: conexión directa. Se usa para aplicar migraciones.
- Al arrancar, la API aplica las migraciones pendientes de
  `backend/src/infraestructura/bd/migraciones/` y, si la base está vacía, carga los datos de
  demostración.
- Las pruebas automáticas (Vitest y Playwright) **no usan Neon**: usan PostgreSQL en memoria
  (PGlite). Funcionan sin internet y sin cuenta.

## 2. Una sola vez, el dueño del proyecto

La rama `production` tiene todavía las tablas de la versión anterior del proyecto. Antes de que el
grupo cree sus ramas, el dueño la deja con el esquema actual (borra los datos viejos y carga los
datos demo):

```bash
npm run db:reset
```

Hay una copia de la base anterior en la rama `respaldo-version-leaflet`, por si se necesitara.

## 3. Instalación en tu máquina (una sola vez)

1. Crea una cuenta gratuita en <https://neon.com> con el correo que le diste al dueño del
   proyecto y acepta la invitación que llega a ese correo (revisa spam).
2. Ten instalado Node.js 22.12 o superior: `node --version`.
3. Clona el repositorio e instala las dependencias:

   ```bash
   git clone https://github.com/Raul-Cabrerac/lotes-urbanizacion.git
   cd lotes-urbanizacion
   npm install
   ```

4. En la [consola de Neon](https://console.neon.tech), abre el proyecto del grupo →
   **Branches** → **New branch**. Nombre: `dev-tunombre` (sin espacios ni tildes: `dev-ana`).
   Rama padre: `production`.
5. Con tu rama seleccionada, pulsa **Connect**. Copia la cadena de conexión dos veces:
   - con **Connection pooling** activado → va en `DATABASE_URL`;
   - con **Connection pooling** desactivado → va en `DATABASE_URL_UNPOOLED`.
6. Copia `.env.example` como `.env.local` y pega ahí las dos cadenas:

   ```bash
   copy .env.example .env.local      # Windows (en macOS o Linux: cp)
   ```

## 4. Uso diario

```bash
npm run dev
```

Abre <http://localhost:5173>. En la terminal, la línea de la API debe decir
`base: PostgreSQL (Neon)`. Si dice `base: PostgreSQL en memoria`, falta tu `.env.local`.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta la API y la web sobre tu rama de Neon |
| `npm run db:reset` | Deja **tu rama** como recién creada: borra las tablas, crea el esquema y carga los datos demo |
| `npm run dev:pruebas` | Levanta la app sin Neon, con PostgreSQL en memoria; lo que guardes se pierde al cerrar |

## 5. Reglas del grupo

1. **Cada uno trabaja en su rama personal.** `production` se usa solo para la demostración.
2. **Nunca compartas `.env.local`** ni copies sus direcciones en el chat, en el código o en un
   commit. Ya está en `.gitignore`.
3. **`npm run db:reset` en `production` solo con acuerdo del grupo**: borra los datos que ven todos.
4. **Los cambios de esquema van en una migración nueva** (`002_descripcion.sql` en la carpeta de
   migraciones). Nunca edites una migración que ya se aplicó: la nueva se aplica sola la próxima
   vez que cada uno arranque la API.
5. **Apaga el servidor cuando no lo uses.** El plan gratuito de Neon tiene horas de cómputo
   limitadas; la base se suspende sola tras unos minutos sin conexiones.

## 6. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| La API dice `base: PostgreSQL en memoria` | Falta `.env.local` en la raíz del repositorio, o `DATABASE_URL` está vacía |
| `relation "clientes" already exists` y el aviso "tablas de una versión anterior" | Tu rama nació de `production` antes de actualizarla. Ejecuta `npm run db:reset` |
| Error de permisos o "project not found" en la consola | Todavía no aceptaste la invitación |
| La primera petición tarda unos segundos | Neon estaba suspendido y se está despertando; las siguientes son rápidas |
