# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BioBio Code ERP** is an internal quotation and project management platform for a Chilean software consultancy. Its core feature is a parametric pricing algorithm that calculates quotes from technical specs, distinguishing between *technical cost* (real development hours) and *commercial value* (market hours), allowing internal efficiency (via an "Antigravity" factor) to increase margins instead of lowering prices.

Deployed on Vercel with Firebase as the backend. The UI is in Spanish (Chilean market, CLP currency, RUT ID format).

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
```

There is no test suite or linter configured.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in Firebase credentials:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
FIREBASE_API_KEY=...       # Used by Vercel serverless functions
ALLOWED_ORIGINS=...        # CORS whitelist for /api/leads
```

## Architecture

### Stack

- **Vue 3** (`<script setup>` SFC syntax) + **Vite**
- **Vue Router 4** with auth guards
- **Pinia** for state management
- **Firebase** (Firestore + Auth)
- **Vercel** for hosting + serverless functions (`/api/`)

### Auth & Routing (`src/router/index.js`, `src/main.js`)

Firebase Auth state is checked before the app mounts. All routes except `/` (login) require authentication. Routes under `/admin` and `/usuarios` additionally require `rol='admin'`, which is read from the `usuarios/{uid}` Firestore document. The role is cached in the router to minimize Firestore reads; the cache is cleared on sign-out.

### State Management (`src/store/quotation.js`)

Single Pinia store (`useQuotationStore`) owns the quotation wizard state. Key getters implement the pricing algorithm:

```
Market Hours  = (entities×4 + roles×2 + views×3 + apis×8) × complexity
Real Hours    = Market Hours × (1 − antigravity_factor)
Base Price    = Market Hours × hourly_rate
Final Price   = Base Price × safety_factor − discount
Internal Cost = Real Hours × cost_rate
Margin        = Final Price − Internal Cost
```

The store supports two modes: **parametric** (formula-driven from spec counts) and **custom** (manual line items).

### Composables (`src/composables/`)

Business logic lives in three composables:

- **`useSettings()`** — loads/saves system config from Firestore (`system_settings` doc): spec rates, hourly rate, antigravity factor, safety factor, CRM stage matrix.
- **`useFinancials()`** — fetches projects, transactions, workers; computes dashboard KPIs (total sold, collected, pending, margins).
- **`useAlert()`** — global reactive alert state; consumed by `AlertModal.vue` mounted in `App.vue`.

### Firebase (`src/firebase/firebaseConfig.js`)

Exports `auth` and `db` (Firestore). All Firestore reads/writes happen directly from components and composables using these exports — there is no service layer.

**Key Firestore collections:**

| Collection | Purpose |
|---|---|
| `usuarios` | User accounts; has `rol` field (`admin`/`vendedor`) |
| `cotizaciones` / `proyectos` | Quotations/projects with specs, financials, payments, execution items |
| `clientes` | Client companies (RUT, contact info) |
| `leads` | Web form submissions (write-only via API, read by admins) |
| `transactions` | Income/expense records |
| `workers` | Team members with hourly cost rates |
| `fixed_expenses` | Monthly operational costs |
| `system_settings` | Global config doc |
| `eventos` | Calendar entries |

**Firestore rules** (`firestore.rules`): role-based via `usuarios/{uid}.rol`. Leads collection is write-blocked client-side; creation only allowed through the Vercel serverless endpoint.

### Serverless API (`/api/leads.js`)

Vercel function that receives public lead form submissions. It validates CORS origin against `ALLOWED_ORIGINS`, filters bots via a honeypot field, validates input lengths, then writes to Firestore using the Admin SDK. Returns silent success on bot detection.

### Quotation Wizard Flow

The wizard uses three route-mounted step components inside `NewQuotation.vue`:

1. `Step1TechnicalSpecs.vue` — choose parametric or custom mode, enter spec counts
2. `Step4ClientData.vue` — select or create client
3. `Step5Summary.vue` — review financials, set discount, save to Firestore

### Theming

Light/dark mode is stored in `localStorage` as `'theme'` and applied as a `data-theme` attribute on `document.documentElement`. All colors are CSS variables defined in `src/assets/style.css` under `:root` and `[data-theme='dark']`.

## Conventions

- **Language**: UI labels, Firestore field names, and component comments are in Spanish.
- **Currency**: CLP formatted with `toLocaleString('es-CL')`.
- **RUT**: Chilean tax ID formatting/validation lives in `src/utils/rutUtils.js`.
- **Icons**: Font Awesome 6.4 loaded via CDN; use FA class names directly in templates.
- **Rich text**: Quill editor (`@vueup/vue-quill`) for scope-of-service fields; output sanitized with DOMPurify before rendering.
- **PDF export**: `html2pdf.js` used in `Step5Summary.vue` and `PrintView.vue`.
- **Project status values**: `Draft`, `Sent`, `Approved`, `Rejected`, `En Curso`, `Completed`.
