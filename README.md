# Auralith Backend

API privada para productos, inventario, pedidos Web/TikTok/Tienda y panel
administrativo.

## Stack

- NestJS
- Fastify
- Supabase JavaScript Client
- PostgreSQL mediante `postgres`
- Validacion de variables con Joi

## Inicio local

```bash
npm install
npm run db:migrate
npm run db:seed
npm run admin:bootstrap
npm run start:dev
```

Comandos de verificacion:

```bash
npm run typecheck
npm run build
npm run smoke
```

Rutas principales:

- `GET /api`
- `GET /api/health`
- `GET /api/health/database`
- `POST /api/auth/login`
- `GET /api/catalog/products`
- `GET /api/catalog/categories`
- `GET /api/catalog/intentions`
- `POST /api/orders`
- `POST /api/complaints`
- `GET /api/admin/dashboard`
- `GET|POST|PUT|DELETE /api/admin/products`
- `GET|POST|PATCH /api/admin/orders`
- `GET /api/admin/orders/:id/shipping-label.pdf`
- `GET|PUT /api/admin/content`

La migracion inicial crea tablas, indices, funciones de correlativos, RLS,
politicas publicas de lectura y el historial de inventario. El seed es
idempotente y carga el catalogo inicial sin sobrescribir el stock operativo.

## Variables

`SUPABASE_PUBLISHABLE_KEY` puede compartirse con aplicaciones publicas.
`SUPABASE_SECRET_KEY` y `DATABASE_URL` solo pueden existir en backend y nunca
deben entrar en Git.

Para Cloud Run, usa la URL del **Transaction pooler** de Supabase y guarda los
secretos en Google Secret Manager.

El bucket `product-images` debe ser publico para lectura. Las escrituras y
eliminaciones se realizan solo desde el backend con `SUPABASE_SECRET_KEY`.
