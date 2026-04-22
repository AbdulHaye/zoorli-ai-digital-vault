# Zorli AI Vault

An AI-powered secure vault and file management platform with web and mobile support. Features document parsing, AI chat with document context, password management, and subscription-based access control.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js, TypeScript |
| Web Frontend | React 18, Vite, Tailwind CSS, Radix UI, TanStack Query |
| Mobile | React Native, Expo 54 |
| Database | Supabase (PostgreSQL + pgvector), Drizzle ORM |
| Auth | Passport.js, Supabase |
| AI | OpenAI |
| Payments | Stripe |
| File Storage | Supabase Storage, Google Cloud Storage |
| Email | SendGrid, Nodemailer |
| Job Queue | BullMQ |

---

## Project Setup

### Prerequisites

- Node.js 20+
- npm
- Supabase database (Neon recommended)

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Key variables:

```env
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
VITE_STRIPE_PUBLIC_KEY=
SESSION_SECRET=
ENCRYPTION_KEY=
```

### Install Dependencies

```bash
npm install
```

### Database Setup

```bash
npm run db:push
```

---

## Running the App

### Web (Backend + Frontend together)

```bash
npm run dev
```

The Express server serves both the API and the Vite-built React frontend.

| Service | URL |
|---|---|
| Web App | http://localhost:5000 |
| API | http://localhost:5000/api |

### Mobile App (React Native / Expo)

```bash
cd mobile
npm install
npm start
```

Then press:
- `a` — open on Android emulator
- `i` — open on iOS simulator
- `w` — open in browser

The mobile app connects to the backend via `EXPO_PUBLIC_API_URL` in `mobile/.env`.

---

## Build for Production

```bash
npm run build   # builds server + client
npm start       # runs production server
```
