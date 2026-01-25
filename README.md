# 1863 Football Manager

## Project Overview

**1863 Football Manager** is a football management simulation game designed for mobile devices PWA (via Capacitor) and web browsers.

The "1863" brand evokes the heritage of football, referencing the year the Football Association was founded, though the game itself is set in a modern simulation environment with fictional leagues and players.

It offers a nostalgic yet modern user experience, focusing on quick, engaging gameplay sessions typical of mobile gaming, while retaining the depth expected of the management genre.

## Key Features

*   **Retro Aesthetic:** A clean, paper-textured UI inspired by classic football press and vintage ledgers, modernized with smooth animations and responsive design.
*   **Procedural World:** Every new game generates a unique football world with leagues, clubs, and thousands of players with distinct attributes.
*   **Tactical Engine:** Set formations (2-3-5, WM, etc.), instructions, and watch matches unfold via a simulated commentary engine.
*   **Live Match Experience:** Follow matches in real-time with a dynamic scoreboard and text-based commentary.
*   **Transfer Market:** Scout, buy, and sell players to build your dream squad.
*   **Club Management:** Manage finances, stadium upgrades, and board expectations.
*   **Cross-Platform:** Built with React/Preact and Capacitor for seamless deployment on iOS, Android, and Web.

## Tech Stack

*   **Core:** React (via Preact for performance), TypeScript, Vite.
*   **State Management:** Zustand.
*   **Database:** Dexie.js (IndexedDB wrapper) for robust, offline-capable local storage.
*   **Styling:** Tailwind CSS.
*   **Mobile:** Capacitor.
*   **Icons:** Lucide-React.

## Development Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run Development Server:**
    ```bash
    npm run dev
    ```

3.  **Build for Production:**
    ```bash
    npm run build
    ```

## Architecture Highlights

*   **Service Layer:** Business logic is encapsulated in services (e.g., `MatchService`, `TransferService`) to keep components clean.
*   **Simulation Worker:** Intensive tasks like simulating match days for other leagues run in a Web Worker to prevent UI blocking.
*   **Data-Driven:** The game relies heavily on procedural generation, ensuring high replayability.

## License

MIT
