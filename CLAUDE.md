# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `ng serve` (available at http://localhost:4200)
- **Build project**: `ng build`
- **Run tests**: `ng test`
- **Watch build**: `ng build --watch --configuration development`
- **Serve SSR**: `node dist/game/server/server.mjs`

## Project Architecture

This is an Angular 20.2.0 application with Server-Side Rendering (SSR) support that implements various browser games. The project uses:

- **Frontend**: Angular with standalone components, signals-based state management
- **Styling**: TailwindCSS with custom Game Boy and Neon aesthetic themes
- **Build**: Angular CLI with esbuild
- **Testing**: Jasmine + Karma

### Key Structure

- `src/app/app.ts` - Main app component with navigation and theme switching
- `src/app/app.routes.ts` - Lazy-loaded route configuration
- `src/app/snake/` - Snake game implementation using Angular signals
- `src/server.ts` - Express SSR server configuration

### Game Implementation Pattern

Games are implemented as standalone Angular components with:
- Signal-based reactive state management
- Touch/keyboard controls with direction validation
- Game loop using `setInterval` with cleanup in `ngOnDestroy`
- Responsive design with mobile-specific controls
- TailwindCSS classes for theming (lime/green for retro, fuchsia/cyan for neon)

### Code Conventions

- Use Angular signals for state management instead of traditional RxJS observables
- Components use `protected` visibility for template-accessible members
- Standalone components with explicit imports
- SCSS styling with TailwindCSS utility classes
- TypeScript interfaces for game entities (Position, Direction types)

### Current Games

- **Snake**: Complete implementation with pause/resume, touch controls, collision detection
- **Pet Match**: Planned (navigation exists but not implemented)