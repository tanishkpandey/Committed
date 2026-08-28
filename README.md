# Committed 🎯

> **Stay committed to your craft.** A modern, responsive habit-tracking and behavioral intelligence platform built with GitHub-style contribution heatmaps, multi-year milestones, and real-time cloud synchronization.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)
![Express](https://img.shields.io/badge/Express-4.x-blue.svg)
![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E.svg)
![Design](https://img.shields.io/badge/UI-AMOLED%20Dark%20%2F%20Mobile%20First-8B5CF6.svg)
![License](https://img.shields.io/badge/License-MIT-orange.svg)

---

## 🌟 Overview

**Committed** is designed for lifelong habit builders. It bridges the gap between simple daily checklists and deep behavioral intelligence by separating:
- **Progress** (*What have I achieved?*) — Lifetime XP, Player Levels, 24 Tiered Multi-Year Milestones, Perfect Days, and All-Time Records.
- **Insights** (*What can I learn from my behavior?*) — Streak Risk Alerts, Best Day distribution, 30-Day Growth deltas, Streak Break patterns, and Bounce-Back speeds.

---

## ✨ Key Features

### 1. 📊 GitHub-Style Contribution Grids
- **Year-Round Visualization:** Rolling 365-day contribution heatmaps reflecting consistency across days, months, and years.
- **Custom Tile Styling:** Choose between soft rounded, classic square, pill capsule, or circular dot tiles with custom color palettes.
- **Floating Unclipped Tooltips:** View completion date, status, and XP bonuses with viewport boundary detection.

### 2. 🧠 Behavioral Intelligence & Pattern Recognition
- 🚨 **Streak at Risk Alerts:** Real-time warnings when an active streak is pending today.
- 📈 **Best Days & Completion Rate:** Identifies peak productive days and plots weekly execution curves.
- 🎯 **Behavioral Categorization:** Identifies your **Best Habit**, **Focus Area**, **Strongest Growth Habit**, and **Stable Anchor**.
- 🔄 **Consistency Patterns:** Tracks typical streak break cadences (e.g. 3–6 days) and average bounce-back restart gaps.

### 3. 🏆 Multi-Year Milestone Roadmap (24 Lifelong Badges)
Categorized into 4 distinct tracks:
- 🔥 **Streak Legends:** Scaled from 7-Day Sprint up to 730-Day Grandmaster (2 full unbroken years).
- ⭐ **Perfect Days Mastery:** Tracks cumulative flawless days from 1 Perfect Day up to 500 Perfect Days.
- 📊 **Consistency Targets:** Monthly targets (70%, 80%, 90%) and Annual Excellence (80%+ across 365 days).
- 🏆 **Lifetime Volume Clubs:** Celebrating total check-ins from 100 (Century) to 10,000 (Hall of Fame).

### 4. 📱 Mobile-First 2-Column Experience
- **Scroll Less, See More:** Milestone cards are arranged in an ultra-compact 2-column mobile layout.
- **High-Contrast Vector Tabs:** Fast category filtering with official Lucide vector icons and zero cartoon emojis.
- **Safe-Area Padding:** Dynamic padding ensures bottom navigation never covers cards or buttons.

### 5. ☁️ Supabase PostgreSQL Cloud Sync & Dual-Mode Engine
- **Cloud-Native:** Backed by Supabase PostgreSQL for multi-device synchronization.
- **Offline Resilience:** Seamless fallback to local file storage (store.json) when offline.
- **Smart Import Engine:** Automatic detection and conversion for both native HabitKit mobile exports and web JSON backups.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML5, CSS3 Custom Properties (Fluid & Mobile-First), ES6+ JavaScript, Lucide Icons.
- **Backend:** Node.js, Express.js.
- **Database:** Supabase (Cloud PostgreSQL) with local fallback.
- **Audio & Animations:** Web Audio API sound effects and CSS3 hardware-accelerated animations.

---

## 🚀 Quick Start

### 1. Clone Repository
`ash
git clone https://github.com/tanishkpandey/Committed.git
cd Committed
`

### 2. Install Dependencies
`ash
npm install
`

### 3. Configure Environment Variables
Copy .env.example to .env:
`ash
cp .env.example .env
`
Fill in your Supabase credentials:
`env
PORT=3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-key
`
*(If Supabase keys are not provided, Committed automatically runs in local storage mode.)*

### 4. Start Development Server
`ash
npm start
`
Visit **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 📁 Project Architecture

`
Committed/
├── public/                     # Static client files
│   ├── index.html              # Main dashboard with rolling heatmaps
│   ├── progress.html           # Player levels & 24 multi-year milestones
│   ├── analytics.html          # Behavioral intelligence & patterns
│   ├── habit-detail.html       # Single habit calendar breakdown
│   ├── settings.html           # Category management & JSON import/export
│   ├── css/                    # Fluid modular styles
│   └── js/                     # Client controllers & API client
├── server/                     # Backend application
│   ├── config/db.js            # Supabase client & local storage manager
│   ├── controllers/            # Route controllers
│   ├── services/
│   │   ├── insightsEngine.js   # Behavioral analytics engine
│   │   └── progressionEngine.js# XP, Level & Milestone calculations
│   └── server.js               # Express server entry point
├── package.json
└── README.md
`

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
