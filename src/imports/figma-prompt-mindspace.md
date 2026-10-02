# Figma Design Prompt — Student Mental Health & Stress Management App

Copy-paste this into your Figma AI tool.

---

Design a mobile-first UI (with a companion desktop dashboard) for **"MindSpace"** — a student stress and mental health management app. Visual style: dark mode, calm-but-modern, glassmorphic cards, soft gradient blob accents (purple → magenta → blue), similar to a premium wellness/fintech hybrid. Avoid clinical or sterile hospital aesthetics — this should feel supportive and approachable, not alarming.

## Color Palette
- Background: near-black (#0A0A0F, #12121A)
- Primary gradient: violet #7C3AED → magenta #C026D3 → soft blue #3B82F6 (used sparingly for blobs, progress rings, hero accents)
- Card surfaces: dark glass #1A1A24 with subtle 1px border (rgba white 8%) and slight blur
- Success/calm: soft teal #2DD4BF
- Warning/high stress: warm coral #FB7185 (never harsh red — this is about support, not alarm)
- Text: off-white #F5F5F7 primary, #9CA3AF secondary

## Typography
Clean geometric sans-serif (Inter, Satoshi, or similar). Large confident headlines for hero/summary screens, tighter body text for data-dense screens.

## Screens to Design

**1. Onboarding**
- 3-step flow: welcome screen with a soft animated gradient blob (like a calm "breathing" shape), a short PSS-style stress questionnaire, and a permissions screen (sleep/activity data, notifications).

**2. Home Dashboard**
- Top: greeting + today's stress score as a circular gradient ring (Low/Medium/High, color-coded teal→amber→coral)
- Below: a horizontal row of glass cards — "Sleep," "Study Hours," "Mood Check-in," "Screen Time" — each with a small sparkline
- A weekly heatmap calendar (like a GitHub contribution grid) showing stress levels per day, purple intensity scale
- Quick-access floating action button for the chatbot

**3. Stress Insights / Correlations**
- A network graph (nodes = factors like "Exams," "Sleep," "Social," "Deadlines," connected by lines whose thickness = correlation strength to stress) — visually similar to a force-directed graph, glowing nodes on dark background
- Below it, a simple explainability panel: "Your stress rises most around low sleep + upcoming deadlines"

**4. Mood & Journal Check-in**
- Card-based emoji/slider mood picker
- Journal text entry with a soft gradient blob background echo
- Streak tracker: "7-day check-in streak" with small flame/spark icons

**5. Chatbot / Coping Assistant**
- Chat UI with dark bubbles, user messages in gradient-filled bubbles, assistant messages in flat glass cards
- Suggested quick-reply chips: "Breathing exercise," "Talk to someone," "I'm okay, just venting"
- Escalation state: gentle banner offering to connect with a counselor if distress signals repeat

**6. Gamification / Wellness Streaks**
- Kanban-style board (borrow the card-column layout) with columns: "Today," "This Week's Habits," "Completed," "Rewards"
- Checklist cards for habits (hydration, breathing, sleep goal) with colored left-border accents per category (like the reference dashboard's colored card borders)
- Points/badges section with soft gradient badge icons

**7. Resources / Support**
- List of coping resources, breathing exercises, and (if flagged) counselor contact — calm card list, not clinical

**8. Counselor/Admin View (desktop)**
- Aggregated, anonymized cohort view: bar chart of average stress by week, a flagged-students list (privacy-respecting, opt-in only), and the same heatmap pattern scaled to a cohort level

## Interaction/Motion Notes
- Gradient blobs should feel slow and organic, not sharp — used only in hero/empty states, not data screens (data screens stay clean and legible)
- Progress rings and streak flames animate on load
- Keep data-dense screens (dashboard, insights) restrained — gradients are accents, not backgrounds, so numbers stay readable

## Accessibility Note
Ensure stress-level color coding isn't the only signal (pair color with icons/labels) for colorblind users, and keep contrast AA-compliant on all text over gradient/glass surfaces.
