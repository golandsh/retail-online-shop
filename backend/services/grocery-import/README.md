# Grocery-ImporterApi

Firebase Cloud Functions importer for Grocery product CSV files.

The function listens for CSV uploads in Firebase Storage, validates each row with Zod, upserts product documents in Cloud Firestore, moves successful files to the history folder, and emails maintainers when an import fails. On failure the import stops immediately and throws `ImportPriceFail`.

See [docs/firestore-schema.md](docs/firestore-schema.md) for the Grocery Delivery System Firestore data model.

This package is part of the `retail-online-shop` pnpm monorepo. Use **pnpm**, not npm, for installs and scripts.

## CSV Structure

Upload CSV files to the configured import folder, defaulting to `imports/prices/`.

```csv
ProductID,description,IsWeightable,CategoryID,CategoryName,SubCategoryID,SubCategoryName,ImageURL,Price
1001,Milk 3 Percent,false,1,Dairy Products,10,Milk,https://example.com/milk.jpg,7.50
1002,White Bread,false,2,Bakery,,,,6.90
```

| Column | Required | Notes |
|---|---|---|
| `ProductID` | Optional on create | Required to update an existing product |
| `description` | Yes | Product name (max 50 chars) |
| `IsWeightable` | Yes | `true`/`false`, `1`/`0`, `yes`/`no` |
| `CategoryID` | Optional* | Parent category numeric id |
| `CategoryName` | Optional* | Parent category description |
| `SubCategoryID` | Optional | Subcategory numeric id |
| `SubCategoryName` | Optional | Subcategory description |
| `ImageURL` | Optional | `http`/`https` URL (max 500 chars) |
| `Price` | Yes | Decimal price |

\* At least one of `CategoryID` or `CategoryName` is required per row.

Supported header aliases include `product id`, `category desc`, `category name`, `sub category id`, `sub category name`, `weightable`, and `new price`.

### Validation rules

- **Category:** if `CategoryID` is provided it must exist; if `CategoryName` is also provided it must match the stored description. If only `CategoryName` is provided, the importer creates the parent category when missing.
- **Subcategory:** same hybrid rules under the resolved parent category. If subcategory columns are empty, the product is stored without `subCategoryId`.
- **Product:** if `ProductID` is provided, it must match the stored description or be unused. If omitted, a new product id is allocated. Import fails when the description already exists without a `ProductID`.
- **Price:** upserts `priceLists` for the resolved product (`createDate` on insert, `modifyDate` on update).

Each imported row writes:

- Parent and subcategory documents to `categories/{id}`
- Product catalog fields to `products/{id}`
- Imported prices to `priceLists/{id}`
- Operational logs to `importLogs`

See [docs/firestore-schema.md](docs/firestore-schema.md) for the full GDS model, including `orders`, `orderDetails`, `users`, and `addresses` (not populated by CSV import).

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

## Catalog API (`grocery-api`)

The sibling service [`backend/services/grocery-api`](../grocery-api/) exposes a public HTTP endpoint `getCatalog` that returns products (with prices), categories, and optional user lookup from Firestore.

Full API contract: [../grocery-api/README.md](../grocery-api/README.md)

### Prerequisites

Same as above: Node 22, pnpm, Firebase emulators running (`pnpm docker:up` or Firebase CLI).

### Build the catalog function

From the monorepo root:

```bash
pnpm --filter grocery-api build
```

Watch mode while editing TypeScript:

```bash
pnpm --filter grocery-api dev
```

After changing catalog code, rebuild and restart emulators if the function does not hot-reload:

```bash
pnpm --filter grocery-api build
docker restart online-shop-firebase-local
```

### Test the endpoint locally

Emulator URL:

```
GET http://127.0.0.1:5001/online-shop-bf396/us-east1/getCatalog
```

Query parameters (optional — use one, not both):

| Param | Example |
|-------|---------|
| `phone` | `?phone=0501234567` |
| `userId` | `?userId=42` |

Examples:

```bash
# products + categories only (no user)
curl "http://127.0.0.1:5001/online-shop-bf396/us-east1/getCatalog"

# include user by phone
curl "http://127.0.0.1:5001/online-shop-bf396/us-east1/getCatalog?phone=0501234567"

# include user by id
curl "http://127.0.0.1:5001/online-shop-bf396/us-east1/getCatalog?userId=42"
```

### Sample data for testing

1. Import [samples/sample-products.csv](samples/sample-products.csv) (see **Trigger an import** above) so Firestore has products, categories, and prices.
2. Add a `users` document and optional `addresses` document in the Firestore emulator UI (`http://localhost:4000/firestore`) to test user lookup.

### Catalog unit tests

```bash
pnpm --filter grocery-api test
pnpm --filter grocery-api lint
```

### Production URL

After deploy (`pnpm run deploy:functions`):

```
https://us-east1-online-shop-bf396.cloudfunctions.net/getCatalog
```
