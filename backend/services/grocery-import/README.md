# Grocery-ImporterApi

Firebase Cloud Functions importer for Grocery product CSV files.

The function listens for CSV uploads in Firebase Storage, validates each row with Zod, upserts product documents in Cloud Firestore, moves successful files to the history folder, and emails maintainers when an import fails. On failure the import stops immediately and throws `ImportPriceFail`.

See [docs/firestore-schema.md](docs/firestore-schema.md) for the Grocery Delivery System Firestore data model.

This package is part of the `retail-online-shop` pnpm monorepo. Use **pnpm**, not npm, for installs and scripts.

## CSV Structure

Upload CSV files to the configured import folder, defaulting to `imports/prices/`.

Required columns:

```csv
ProductId,product desc,categoryId,category desc,new price,weightable
123,Milk 3%,dairy,Dairy Products,7.50,false
456,Bananas,produce,Produce,4.00,true
```

Supported aliases:

- `ProductId`, `product id`, `productId`
- `product desc`, `product description`, `productDesc`
- `categoryId`, `category id`, `category`
- `category desc`, `category description`, `categoryDesc`
- `new price`, `price`
- `weightable`, `wieghtable`, `weighable`

Each imported row writes:

- Product catalog fields to `products/{ProductId}` without `categoryDesc` or `price`
- Category descriptions to `categories/{categoryId}`
- Imported prices to `PriceLists/{ProductId}`
- Auto-increment integer `id` fields using `counters/{tableName}`
- Operational logs to `importLogs`

## Environment

Create `.env.local` in this directory for local development. Do not commit real secrets.

```bash
IMPORT_STORAGE_BUCKET=online-shop-bf396.firebasestorage.app
IMPORT_FOLDER=imports/prices/
HISTORY_FOLDER=imports/history/
IMPORT_FAILURE_EMAIL_TO=admin@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=local-password
SMTP_FROM=no-reply@example.com
```

## Prerequisites

- Node.js >= 22
- pnpm >= 11.8.0

Install pnpm if needed:

```bash
npm install -g pnpm
```

## Install dependencies

From the **monorepo root** (`retail-online-shop/`):

```bash
pnpm install
```

Do not run `npm install` inside this package. The repo uses a shared pnpm workspace and lockfile.

## Local Development

### 1. Build the function

From the monorepo root:

```bash
pnpm --filter grocery-import build
```

Or from this directory:

```bash
pnpm run build
```

Watch mode while editing TypeScript:

```bash
pnpm run dev
```

### 2. Start Firebase emulators

**Option A — Docker (recommended)**

From the monorepo root:

```bash
pnpm docker:up
```

Stop the emulators:

```bash
pnpm docker:down
```

**Option B — Firebase CLI on the host**

From the monorepo root:

```bash
pnpm exec firebase emulators:start --config online-shop-firebase-local/firebase.json --project online-shop-bf396
```

Emulator UI: `http://localhost:4000`

### 3. Trigger an import

Upload [samples/sample-products.csv](samples/sample-products.csv) to `imports/prices/` in Storage, or use the admin frontend upload flow.

The function listens to the `online-shop-bf396.firebasestorage.app` bucket and only processes `.csv` files under `imports/prices/`.

Storage emulator UI: `http://localhost:4000/storage/online-shop-bf396.firebasestorage.app`

Confirm the function logs show CSV parsing, row validation, Firestore upserts, archive movement, and final status.

### 4. Run checks

From the monorepo root:

```bash
pnpm --filter grocery-import test
pnpm --filter grocery-import lint
pnpm --filter grocery-import build
```

Or from this directory:

```bash
pnpm test
pnpm run lint
pnpm run build
```

## Deploy

Build before deployment:

```bash
pnpm --filter grocery-import build
```

Log in and select the Firebase project:

```bash
pnpm exec firebase login
pnpm exec firebase use online-shop-bf396
```

Configure production values through Firebase environment support or secrets. Use secrets for sensitive values such as `SMTP_PASS`.

Deploy from the monorepo root:

```bash
pnpm run deploy:functions
```

Or directly:

```bash
pnpm exec firebase deploy --only functions
```

The root `firebase.json` runs `pnpm --prefix "$RESOURCE_DIR" run build` automatically before deploy.

Check production logs:

```bash
pnpm exec firebase functions:log
```
