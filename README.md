# FlatSync 🛒

> Real-time shared grocery list for flatmates ordering on Blinkit, Zepto & Instamart.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Backend / DB**: Supabase (PostgreSQL + Realtime)
- **State**: Zustand
- **Animations**: Framer Motion
- **Icons**: Lucide React

---

## Getting Started

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the full schema from `supabase/schema.sql`
3. Copy your **Project URL** and **Anon Key** from Project Settings → API

### 2. Environment Variables

```bash
cp .env.example .env.local
# Fill in your Supabase URL and Anon Key
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── (auth)/       # Login & Register
│   ├── onboarding/   # Create or Join flat
│   └── flat/[flatId] # Dashboard, History, Settings
├── components/
│   ├── ui/           # Base design system
│   ├── grocery/      # List, item cards, add form, filters
│   ├── ordering/     # Banner, drawers, checklist
│   └── layout/       # Header, BottomNav
├── hooks/            # Supabase + Zustand hooks
├── lib/              # Supabase clients, utils, constants
├── store/            # Zustand global store
└── types/            # TypeScript interfaces
```

---

## Features

- 🏠 **Flat Groups** — Create or join via 6-char code
- 📋 **Shared Grocery List** — Real-time sync across all flatmates
- 🛒 **Ordering Mode** — "I'm ordering on Blinkit!" banner notifies everyone
- ✅ **Ordering Checklist** — Mark items in-cart as you shop
- 📦 **Order History** — See past orders with one-tap re-add
- 🌗 **Dark/Light Mode** — System-aware with manual toggle
- 📱 **Mobile-First** — Designed for phones, works on desktop

---

## Deployment (Vercel)

```bash
npm i -g vercel
vercel --prod
# Set environment variables in Vercel dashboard
```
