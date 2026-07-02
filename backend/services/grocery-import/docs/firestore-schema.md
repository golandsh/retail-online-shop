# Firestore Schema

This document defines the Cloud Firestore model for the Grocery Delivery System (GDS), aligned with the GDS entity diagram.

## Import Flow

CSV price imports are handled by the Firebase Storage trigger in `src/index.ts`. Each valid row is normalized in `src/product-row.ts`, categories are resolved in `src/category-resolver.ts`, and rows are written by `src/importProductCsv.ts`.

The importer currently writes:

- Parent and subcategory data to `categories/{id}`
- Product catalog data to `products/{id}`
- Imported prices to `priceLists/{id}`

Collections documented below but **not** populated by the CSV importer: `orders`, `orderDetails`, `users`, `addresses`.

Document IDs are numeric strings (e.g. `"1001"`). Auto-increment integer `id` fields are allocated from the `counters` collection when not supplied by CSV.

## Collections

### `categories/{id}`

Hierarchical category lookup. Top-level categories have `parentId: null`. Subcategories reference their parent via `parentId`.

Fields:

- `id`: number, auto-increment category id (matches document id)
- `parentId`: number or null
- `description`: string
- `createdAt`: Firestore server timestamp
- `updatedAt`: Firestore server timestamp

### `products/{id}`

Master product catalog.

Fields:

- `id`: number, auto-increment product id (matches document id)
- `description`: string
- `isWeightable`: boolean
- `categoryId`: number, FK to parent category
- `subCategoryId`: number or null, FK to subcategory
- `imageUrl`: string or null
- `createdAt`: Firestore server timestamp
- `updatedAt`: Firestore server timestamp

### `priceLists/{id}`

Imported product price records.

Fields:

- `id`: number, auto-increment price list id
- `productId`: number, FK to product
- `price`: number
- `createDate`: Firestore server timestamp
- `modifyDate`: Firestore server timestamp
- `source`: string, e.g. `csv_import`

### `orders/{id}`

Customer order header. Not populated by CSV import.

Fields:

- `id`: number
- `status`: string
- `startDate`: Firestore timestamp
- `modifyDate`: Firestore timestamp
- `preAuthPrice`: number
- `completePrice`: number
- `notes`: string or null

### `orderDetails/{orderId}_{productId}`

Order line items. Not populated by CSV import.

Fields:

- `orderId`: number
- `productId`: number
- `preAuthPrice`: number
- `completePrice`: number
- `preAuthAmount`: number
- `completeAmount`: number

### `users/{id}`

User profile. Not populated by CSV import.

Fields:

- `id`: number
- `fullName`: string
- `phone`: string
- `pt`: string

### `addresses/{id}`

User delivery address. Not populated by CSV import.

Fields:

- `id`: number
- `city`: string
- `street`: string
- `number`: number
- `apartment`: number or null
- `postalCode`: number
- `notes`: string or null
- `userId`: number, FK to user

### `counters/{counterName}`

Technical counter documents for allocating numeric ids.

Fields:

- `nextId`: number
- `updatedAt`: Firestore server timestamp

### `importLogs/{importLogId}`

Operational import logs written by the CSV importer.

Fields:

- `bucket`: string
- `fileName`: string
- `generation`: string or null
- `status`: `succeeded` or `failed`
- `result`: map, import counts on success
- `archivedFileName`: string, present on success
- `error`: string, present on failure
- `durationMs`: number
- `createdAt`: Firestore server timestamp

## Query Patterns

- Products by category: query `products` where `categoryId == value`
- Subcategories of a category: query `categories` where `parentId == categoryId`
- Current price for product: query `priceLists` where `productId == value` (latest by `modifyDate`)
- Category by name: query `categories` where `description == value` and `parentId == null` (or specific parent)
