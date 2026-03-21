# Selfly — For Sale By Owner Real Estate Platform

Selfly is a full-stack FSBO (For Sale By Owner) real estate platform that empowers homeowners to list, market, and sell their properties directly to buyers — no agent required.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo / React Native (iOS & Android) |
| Web / API | Next.js (App Router) |
| Database & Auth | Supabase (Postgres, Auth, Storage, Realtime) |
| Hosting | Vercel |
| Monorepo | npm workspaces |

## Monorepo Structure

```
selfly/
├── apps/
│   ├── mobile/          # Expo React Native app (iOS App Store target)
│   └── web/             # Next.js API backend + marketing site
├── packages/
│   └── shared/          # Shared TypeScript types and utilities
├── package.json         # Root workspace config
├── tsconfig.json        # Base TypeScript config
└── README.md
```

## Build Plan

### Phase 1 — Auth & User Profiles
- Supabase Auth integration (email/password, OAuth providers)
- User registration and login flows (mobile + web)
- Profile creation and editing (name, avatar, phone, bio)
- Role-based access: buyer, seller, admin
- Protected routes and session management

### Phase 2 — Property Listings
- Create / read / update / delete listings
- Image upload via Supabase Storage (multiple photos per listing)
- Property detail fields: price, address, beds, baths, sqft, lot size, year built, type
- Listing status management: draft → active → pending → sold
- Owner dashboard showing all their listings

### Phase 3 — Search & Discovery
- Full-text and filtered search (price range, beds, baths, sqft, property type)
- Location-based search with map view (MapView on mobile, Mapbox/Google Maps on web)
- Saved searches with optional push/email notifications
- Recently viewed and favorited listings
- Sort by price, date listed, distance

### Phase 4 — Messaging
- In-app messaging between buyers and sellers
- Supabase Realtime for live chat
- Message threads tied to specific listings
- Push notifications for new messages
- Conversation list and unread counts

### Phase 5 — Payments & Transactions
- Offer submission and negotiation workflow
- Document upload and e-signature integration
- Escrow and payment tracking
- Transaction timeline and status updates
- Closing checklist

### Phase 6 — Admin & Analytics
- Admin dashboard for content moderation
- Flag / report listings
- User management and account actions
- Platform analytics: listings created, searches, messages, conversions
- Revenue and transaction metrics

### Phase 7 — Polish & Launch
- Performance optimization (images, lazy loading, caching)
- Accessibility audit (WCAG compliance)
- App Store assets and submission (iOS)
- Marketing / landing page on web
- SEO for listing pages
- Monitoring, error tracking, and alerting

## Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9
- Expo CLI (`npx expo`)
- A Supabase project (https://supabase.com)

### Setup

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd selfly
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Copy each `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   cp apps/mobile/.env.example apps/mobile/.env
   cp apps/web/.env.example apps/web/.env
   ```

4. **Run the mobile app**
   ```bash
   cd apps/mobile
   npx expo start
   ```

5. **Run the web API**
   ```bash
   cd apps/web
   npm run dev
   ```

## Environment Variables

### Root `.env`
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `SUPABASE_JWT_SECRET` | JWT secret for token verification |

### `apps/mobile/.env`
| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase URL (exposed to client) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (exposed to client) |
| `EXPO_PUBLIC_API_URL` | Next.js API base URL |

### `apps/web/.env`
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL (exposed to browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (exposed to browser) |
| `SUPABASE_JWT_SECRET` | JWT secret for verification |
