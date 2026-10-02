# Anchor — Student Wellbeing Companion

Anchor is a thoughtful, full-stack wellbeing application built with **React 19**, **TypeScript**, **Tailwind CSS v4**, and **Supabase (PostgreSQL & Auth)**. It helps students track daily mood, habits, sleep, and focus time with actionable insights and strict data privacy.

---

## Features

- **Authentication & Security:**
  - Supabase Auth: email signup, login, password reset, and session persistence.
  - "Explore as Guest" mode for instant local preview and evaluation.
  - Strict PostgreSQL Row Level Security (RLS) guaranteeing users can only read and write their own data.
  - Automated database trigger that provisions user profiles and starter habits on account creation.
- **Daily Check-ins & Records:**
  - Log daily mood and sleep ratings.
  - Track focus session minutes and calm/breathing cooldowns.
  - Real-time 7-day metric rings and streaks.
- **Habits Tracker:**
  - Track daily habit completions.
  - Add custom habits and delete existing ones with instant synchronization.
- **Journaling:**
  - Write and save daily journal entries linked to mood.
  - Browse past reflections and delete entries when needed.
- **Stress & Factor Insights:**
  - Interactive factor network visualizer showing the relationship between sleep, exams, deadlines, caffeine, and stress.
- **Personalized Appearance & Profiles:**
  - Multiple curated themes: *Soft Forest*, *Sage & Serenity*, and more.
  - Accessibility settings: text resizing, motion reduction, and contrast tuning.
  - Custom profile editing with profile picture upload.
- **Private & Safe:**
  - Export personal data as JSON.
  - One-click data deletion and account clearing.

---

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Bundler:** Vite 8
- **Styling:** Tailwind CSS v4
- **Database & Auth:** Supabase (PostgreSQL with RLS)
- **Deployment:** Vercel (SPA routing configured in `vercel.json`)

---

## Quick Start (Local Development)

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone <repo-url>
cd "Anchor APP"

# Install dependencies
npm install
```

### 2. Configure Supabase

1. Create a free project on [Supabase](https://supabase.com).
2. In your Supabase dashboard, navigate to the **SQL Editor** (`/project/_/sql`).
3. Open `supabase/schema.sql` from this repository, paste the entire script into the SQL Editor, and click **Run**.
   - This creates all necessary tables (`profiles`, `user_preferences`, `daily_records`, `journal_entries`, `habits`, `habit_completions`).
   - Enables Row Level Security (RLS) with secure user policies.
   - Sets up the `on_auth_user_created` trigger for automated onboarding.
4. In your Supabase dashboard, go to **Project Settings** → **API**.
5. Copy your **Project URL** and **anon public key**.

### 3. Set Up Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

> **Note:** If you run the application without setting environment variables, Anchor gracefully runs in **Guest / Local mode**, storing data safely in `localStorage` so you can still explore all screens.

### 4. Run Development Server

```bash
npm run dev
```

Open the preview URL in your browser (default: `http://localhost:8443` or `http://localhost:5173`).

---

## Database Schema Overview

| Table | Purpose | RLS Policy |
|---|---|---|
| `public.profiles` | User profile (name, avatar, course, year, join date) | Owner only (`auth.uid() = id`) |
| `public.user_preferences` | Theme, notifications, text size, motion prefs | Owner only (`auth.uid() = user_id`) |
| `public.daily_records` | Sleep score, mood score, focus & calm seconds per day | Owner only (`auth.uid() = user_id`) |
| `public.journal_entries` | Daily reflections and mood associations | Owner only (`auth.uid() = user_id`) |
| `public.habits` | Habit labels, colors, and order | Owner only (`auth.uid() = user_id`) |
| `public.habit_completions` | Daily habit completion state | Owner only (`auth.uid() = user_id`) |

---

## Vercel Deployment Guide

Anchor is configured for zero-configuration, production deployment on Vercel.

### Method A: One-Click GitHub Import (Recommended)

1. Push this project to your GitHub repository.
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** → **"Project"**.
3. Select your repository.
4. In the project settings:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = *your Supabase project URL*
   - `VITE_SUPABASE_ANON_KEY` = *your Supabase anon key*
6. Click **Deploy**.

### Method B: Deploy via Vercel CLI

```bash
# 1. Login to your Vercel account
npx vercel login

# 2. Deploy to production
npx vercel --prod
```

When prompted:
- Set up and deploy: **Yes**
- Link to existing project: **No** (or link to existing)
- Project name: `anchor-app`
- In your Vercel project settings, add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables and trigger a redeploy.

### Supabase Auth URL Configuration for Production

Once deployed to your Vercel domain (e.g. `https://anchor-app.vercel.app`):
1. In your Supabase dashboard, go to **Authentication** → **URL Configuration**.
2. Set **Site URL** to: `https://your-domain.vercel.app`
3. Under **Redirect URLs**, add:
   - `https://your-domain.vercel.app/**`
   - `http://localhost:8443/**` (for local development)

---

## Verification & Testing Checklist

- [x] TypeScript compilation (`npx tsc --noEmit`) passes with 0 errors.
- [x] Production build (`npm run build`) bundles cleanly into `dist/`.
- [x] Client-side routing rewrite rules configured in `vercel.json`.
- [x] RLS policies and database trigger written in `supabase/schema.sql`.
- [x] Environment variables template provided in `.env.example`.
- [x] Real-time habit creation, completion toggle, and deletion.
- [x] Real-time journal entry creation, persistence, and deletion.
- [x] Complete auth cycle: Sign in, Sign up, Forgot password, Update password, Sign out, and Guest exploration.
