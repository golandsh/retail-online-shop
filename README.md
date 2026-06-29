# Retail Online Shop Monorepo

This repository is a monorepo for the Retail Online Shop project, containing both the frontend admin dashboard and the backend grocery-import service. It is managed using **pnpm** workspaces and **Turborepo** for optimized task execution and caching.

## Project Structure

```text
├── backend/
│   └── services/
│       └── grocery-import/    # Firebase Cloud Functions backend service
├── frontend/
│   └── admin/                  # React & Vite TypeScript admin dashboard
├── package.json                # Root package configuration
├── pnpm-workspace.yaml         # PNPM workspace definition
├── pnpm-lock.yaml              # Monorepo lockfile
└── turbo.json                  # Turborepo task pipeline configuration
```

### Components

#### 1. Frontend Admin (`frontend/admin`)
- **Technology Stack**: React, TypeScript, Vite, Vanilla CSS.
- **Features**:
  - Firebase Google Authentication for secure admin sign-in.
  - CSV and JSON product price catalog file uploads.
  - Uploaded files are sent directly to the Firebase Storage bucket under the `imports/prices/` folder.
  - Beautiful, dynamic UI design with RTL/Hebrew localization.

#### 2. Grocery Import Service (`backend/services/grocery-import`)
- **Technology Stack**: TypeScript, Node.js 22, Firebase Cloud Functions (v2), Firestore, Vitest.
- **Features**:
  - Listens for CSV files uploaded to the Firebase Storage `imports/prices/` folder.
  - Normalizes and validates each row against a schema using **Zod**.
  - Upserts valid products, categories, and price lists in **Cloud Firestore** using transaction-allocated auto-increment numeric IDs.
  - Moves processed files to the `History/` folder in Storage.
  - Tracks import success, failures, and retry attempt counters across Firebase Cloud Function invocations in the `importAttempts` and `importLogs` Firestore collections.
  - Triggers SMTP notification emails to system admins on final import failure.

---

## Installation

### Prerequisites
- **Node.js**: Version 22 (LTS is recommended).
- **PNPM**: Installed globally (e.g., `npm install -g pnpm`).
- **Java Runtime Environment (JRE/JDK)**: Version 21 or higher (required to run local Firebase Emulators).
- **Firebase CLI**: Installed globally or run via `npx` (e.g., `npx firebase login` to authenticate).

### Setup
1. Clone the repository and navigate to the project root:
   ```bash
   cd retail-online-shop
   ```

2. Install all dependencies across all workspace packages:
   ```bash
   pnpm install
   ```

3. Create the local environment file for the frontend dashboard:
   Copy [frontend/admin/.env.example](file:///Users/shlomigoland/Development/Projects/retail-online-shop/frontend/admin/.env.example) to `.env.local` inside `frontend/admin/` and configure your Firebase Web Client config:
   ```bash
   cp frontend/admin/.env.example frontend/admin/.env.local
   ```

4. Create the local environment file for the grocery-import service:
   Copy [backend/services/grocery-import/.env.example](file:///Users/shlomigoland/Development/Projects/retail-online-shop/backend/services/grocery-import/.env.example) to `.env.local` inside `backend/services/grocery-import/`:
   ```bash
   cp backend/services/grocery-import/.env.example backend/services/grocery-import/.env.local
   ```

---

## Local Development

### 1. Start the Dockerized Firebase Emulators
First, launch the central Firestore, Storage, Authentication, and Cloud Functions emulators inside Docker:
```bash
pnpm docker:up
```
The Emulator UI will be accessible at `http://localhost:4000`.


### 2. Running the Whole Project
To launch both the frontend Vite dev server and the backend TypeScript watcher in parallel, run:
```bash
pnpm dev
```
This runs the root dev task defined in `turbo.json`.

- **Admin Web Dashboard**: Accessible at `http://localhost:5173`.
- **Firebase Emulator UI**: Accessible at `http://localhost:4000` (which hosts all emulators, including Functions on port `5001`).

### Running Specific Services
You can run actions on individual workspace packages using pnpm filters:

- **Run frontend dev only**:
  ```bash
  pnpm --filter admin dev
  ```
- **Start Cloud Functions compiler watcher only**:
  ```bash
  pnpm --filter grocery-import dev
  ```



---

## Quality & Checks

You can run workspace-wide quality checks from the root using Turbo:

- **Build all projects**:
  ```bash
  pnpm build
  ```
- **Lint all projects**:
  ```bash
  pnpm lint
  ```
- **Run backend unit tests**:
  ```bash
  pnpm --filter grocery-import test
  ```
