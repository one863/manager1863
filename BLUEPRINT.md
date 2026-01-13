# BLUEPRINT - 1863 Football Manager

## 1. Vision & Core Concept
**"1863"** is a minimalist yet deep football management game. It combines the addictive "one more turn" loop of classic manager games with a modern, mobile-first UX. 
*Note: "1863" is the brand name referencing the birth of modern football rules, but the simulation takes place in a generic timeline, allowing for modern tactics and league structures.*

### Pillars
1.  **Immediacy:** Fast loading, quick day simulation, instant feedback.
2.  **Clarity:** Information is presented clearly without spreadsheets overload. "Easy to learn, hard to master".
3.  **Atmosphere:** A distinct visual identity (paper, ink, typography) that stands out from the generic glossy look of competitors.

## 2. Technical Architecture

### Stack
*   **Framework:** Preact (lighter than React, ideal for mobile).
*   **Language:** TypeScript (strict mode).
*   **Build Tool:** Vite.
*   **Storage:** IndexedDB via Dexie.js (Critical for storing large save files locally).
*   **State:** Zustand (Global UI state) + React Query (optional, for async data, mostly direct Dexie hooks used).
*   **Styling:** Tailwind CSS.
*   **Wrapper:** Capacitor (for iOS/Android build).

### Data Model (Dexie/IndexedDB)
*   `saves`: Meta-data about save slots.
*   `gameState`: Current date, user ID, difficulty, global flags.
*   `leagues`: League structures, tiers.
*   `teams`: Club data (name, colors, stadium, reputation).
*   `players`: Player attributes, contract, stats (The heaviest table).
*   `matches`: Fixtures, results, historical data.
*   `news`: Inbox messages.

## 3. Core Loops

### The "Day" Loop
1.  **Morning:** Check Inbox (News, Transfer offers, Injuries).
2.  **Action:** Adjust tactics, training, or market activity.
3.  **Advance:** Click "Continue".
4.  **Simulation:** 
    *   Simulate other matches (background worker).
    *   Simulate world events (transfers, injuries).
    *   **If Match Day:** Trigger Match Engine.

### The Match Engine
*   **Type:** Text-based + Visualizer (Probability based, not physics based).
*   **Logic:** 
    *   Compare Team Ratings (Defense vs Attack, Midfield Control).
    *   Inject Randomness (Home advantage, Morale, Form).
    *   Generate Events (Goal, Card, Substitution, Injury) based on time slices (e.g., every 5 mins).

## 4. UI/UX Structure

### Views
*   **Dashboard (Hub):** Next match info, league standing summary, board confidence.
*   **Squad:** Player list, line-up selector, fitness/morale status.
*   **Tactics:** Formation picker (2-3-5, WM, etc.), team instructions.
*   **League:** Full table, fixtures, top scorers.
*   **Transfers:** Search players, negotiate contracts, scout reports.
*   **Club:** Finances, Staff, Stadium.

### Design System
*   **Colors:** Off-white/Cream (Paper), Dark Blue/Black (Ink), Gold/Red (Accents).
*   **Typography:** Serif for headings (Classic feel), Sans-serif for data/tables (Readability).
*   **Components:** Cards, Lists, Modals (Overlays), Toast Notifications.

## 5. Development Phases

### Phase 1: Foundation (Done)
*   Project setup (Vite, Tailwind).
*   Database schema design (Dexie).
*   Basic Data Generators (Players, Teams).
*   Basic UI Shell.

### Phase 2: Core Gameplay (Current)
*   Squad Management (Drag & Drop or Click-to-select).
*   Basic Match Simulation (Result generation).
*   League Table logic (Points calculation).
*   Calendar progression.

### Phase 3: Depth
*   Transfer Market logic (Bidding AI).
*   Economy (Wages, Ticket sales).
*   Player Development (Training, Aging).
*   News & Narrative system.

### Phase 4: Polish & Mobile
*   Save/Load system.
*   Animations (Transitions, Match events).
*   Capacitor integration.
*   Performance profiling.

## 6. Future Considerations
*   Multiple Save slots.
*   Editor / Database customization.
*   Achievements system.
