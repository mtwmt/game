# GEMINI.md - Project Analysis: Angular Game Collection

## Project Overview

This is a web application built with **Angular (v20.2)** that serves as a collection of classic games. The project is well-structured, following modern Angular practices, including standalone components and lazy loading for efficient performance.

### Key Technologies:
- **Framework**: Angular 20.2
- **Language**: TypeScript
- **Styling**: SCSS and Tailwind CSS
- **Architecture**: Standalone Components, Server-Side Rendering (SSR) enabled.
- **Code Quality**: Prettier is configured for consistent code formatting.
- **CI/CD**: The project uses `semantic-release` for automated versioning and changelog generation, with a deployment workflow set up in `.github/workflows/deploy.yml`.

### Core Features:
The application features several game modules, loaded on-demand via routing:
1.  **Home Page** (`/`): The main landing page.
2.  **Snake** (`/snake`): The classic Snake game.
3.  **Pet Match** (`/pet-match`): A tile-matching puzzle game (likely a Lianliankan-style game).
4.  **Chinese Chess** (`/chinese-chess`): A feature-rich Chinese Chess implementation with a sophisticated AI opponent.

### Chinese Chess AI (`chess-ai.service.ts`)
The most complex feature is the Chinese Chess AI. It employs a hybrid strategy:
- **Primary AI**: It uses the **Gemini API** (`gemini-2.5-flash` model) to analyze the board state and suggest the best move. It constructs a detailed prompt including the board layout and all possible moves, then parses the JSON response from the API. An API key is required for this functionality, which can be set by the user in the application.
- **Fallback Algorithm**: If the Gemini API is unavailable or fails, the AI falls back to a traditional **Minimax algorithm with Alpha-Beta Pruning**.
- **Difficulty Levels**: The AI supports multiple difficulty settings ('easy', 'medium', 'hard'), which adjust the search depth and time for the Minimax algorithm.

## Building and Running

Standard Angular CLI commands are used for managing the project.

- **Install Dependencies:**
  ```bash
  npm install
  ```

- **Run Development Server:**
  Starts the app on `http://localhost:4200/`.
  ```bash
  npm start
  # or
  ng serve
  ```

- **Build for Production:**
  The output is stored in the `dist/game/` directory.
  ```bash
  npm run build
  # or
  ng build
  ```

- **Run Unit Tests:**
  Executes tests using Karma and Jasmine.
  ```bash
  npm test
  # or
  ng test
  ```

## Development Conventions

- **Component Structure**: The project uses modern standalone components, which are lazily loaded through the router (`src/app/app.routes.ts`) to improve initial load times.
- **State Management**: Component-level state is primarily managed using **Angular Signals** (`signal`, `computed`). This is evident in `chinese-chess.ts` for handling the game state reactively.
- **Styling**: Global styles are in `src/styles.scss`, with component-specific styles written in SCSS files. Tailwind CSS is integrated for utility-first styling.
- **Services**: Business logic is cleanly separated into services. For example, `ChessGameService` handles the rules and state of the chess game, while `ChessAIService` encapsulates all AI-related logic.
- **Routing**: All application routes are defined in `src/app/app.routes.ts`.
