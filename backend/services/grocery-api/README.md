# Grocery Catalog API

Firebase HTTP Cloud Function that exposes a public catalog endpoint for the Grocery Delivery System.

`GET getCatalog` returns:

- **products** — from `products`, merged with latest price from `priceLists`
- **categories** — all documents from `categories`
- **cityStreets** — streets per whitelisted city from [data.gov.il](https://data.gov.il/api/3/action/datastore_search?resource_id=9ad3862c-8391-4b2f-84a4-2d4c68625f4b)
- **user** — optional lookup from `users` (+ joined `addresses` record)

See [../grocery-import/docs/firestore-schema.md](../grocery-import/docs/firestore-schema.md) for the Firestore data model.

This package is part of the `retail-online-shop` pnpm monorepo.

## Endpoint

**Function:** `getCatalog`  
**Method:** `GET`  
**Auth:** none (public)  
**CORS:** enabled

### Query parameters (optional — use one, not both)

| Param | Description |
|-------|-------------|
| `phone` | Find user where `users.phone == phone` |
| `userId` | Find user document `users/{userId}` |

If neither is provided, the response includes `user: null`.

### Example response

```json
{
  "products": [
    {
      "productId": "1001",
      "productDesc": "Milk",
      "categoryId": "10",
      "price": 7.5,
      "weightable": false,
      "image": "https://example.com/milk.jpg"
    }
  ],
  "categories": [
    {
      "categoryId": "1",
      "categoryDesc": "Dairy Products",
      "parentID": null
    }
  ],
  "cityStreets": [
    {
      "city": "חיפה",
      "streets": ["הרצל", "יפו"]
    }
  ],
  "user": {
    "id": "42",
    "fullName": "Israel Israeli",
    "phone": "0501234567",
    "pt": "apt",
    "address": {
      "city": "Tel Aviv",
      "street": "Herzl",
      "number": 1,
      "apartment": 3,
      "postalCode": 12345,
      "notes": null
    }
  }
}
```

### Errors

| Status | When |
|--------|------|
| `400` | Both `phone` and `userId` provided |
| `404` | Lookup param provided but user not found |
| `405` | Non-GET request |
| `500` | Unexpected server error |

## Environment

Create `.env.local` in this directory for local development:

```bash
# Comma-separated city names as they appear in data.gov.il (שם_ישוב)
CATALOG_CITY_WHITELIST=חיפה,ירושלים,תל אביב - יפו

# Optional override
# STREETS_API_URL=https://data.gov.il/api/3/action/datastore_search?resource_id=9ad3862c-8391-4b2f-84a4-2d4c68625f4b
```

City names in `CATALOG_CITY_WHITELIST` are trimmed and sent to the API with the trailing space required by data.gov.il (e.g. `חיפה` → `חיפה `). All whitelisted cities are fetched in **one API call** using a `filters` array.

## Security note

This endpoint is public. Anyone who knows a phone number can fetch that user's profile. Consider Firebase Auth, App Check, or signed tokens before production use with real customer data.

## Local development

Shared emulator setup is documented in [../grocery-import/README.md](../grocery-import/README.md) (Docker / Firebase CLI, Firestore, Storage).

### Build

From the monorepo root:

```bash
pnpm --filter grocery-api build
pnpm --filter grocery-api dev
```

### Emulator URL

```
GET http://127.0.0.1:5001/online-shop-bf396/us-east1/getCatalog
```

Examples:

```bash
curl "http://127.0.0.1:5001/online-shop-bf396/us-east1/getCatalog"
curl "http://127.0.0.1:5001/online-shop-bf396/us-east1/getCatalog?phone=0501234567"
curl "http://127.0.0.1:5001/online-shop-bf396/us-east1/getCatalog?userId=42"
```

Seed Firestore data via CSV import ([grocery-import](../grocery-import/README.md)) and add `users` / `addresses` documents in the emulator UI (`http://localhost:4000/firestore`) to test user lookup.

### Tests

```bash
pnpm --filter grocery-api test
pnpm --filter grocery-api lint
```

## Deploy

From the monorepo root:

```bash
pnpm --filter grocery-api build
pnpm run deploy:functions
```

Production URL:

```
https://us-east1-online-shop-bf396.cloudfunctions.net/getCatalog
```
