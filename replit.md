# AI Council - Multi-Perspective AI Debate System

## Overview

The AI Council is a web application that simulates a deliberative process using multiple AI personas to analyze user queries. The system employs three distinct AI workers (The Skeptic, The Visionary, and The Realist) who each provide unique perspectives on a given question. A Judge AI then evaluates their responses, provides critique, and synthesizes a consensus. This iterative refinement process continues for multiple rounds until a high-quality final answer emerges.

The application demonstrates advanced AI orchestration patterns, combining parallel AI agent execution with iterative refinement loops to produce more balanced and comprehensive responses than a single AI would provide.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, using Vite as the build tool and development server.

**UI Components**: The application uses shadcn/ui components (Radix UI primitives) styled with Tailwind CSS v4. The design system follows a "new-york" style configuration with custom CSS variables for theming, including specialized color variables for each worker persona.

**State Management**: TanStack Query (React Query) handles server state and API interactions. The `useCouncilSimulation` hook encapsulates the simulation state machine, managing the flow between idle → thinking → judging → consensus states. Local storage persistence ensures conversation history survives page refreshes.

**Routing**: wouter provides lightweight client-side routing with a single primary route for the council interface.

**Animation**: Framer Motion powers the UI animations, particularly for the worker cards and judge panel state transitions.

**Responsive Design**: The application uses a mobile-first approach with a collapsible sidebar on mobile devices and tabbed worker views for smaller screens.

### Backend Architecture

**Runtime**: Node.js with Express.js server framework running in ESM mode.

**API Design**: RESTful endpoints manage session lifecycle:
- `POST /api/sessions` - Creates a new council session
- `POST /api/sessions/:id/workers` - Generates worker drafts for current round
- `POST /api/sessions/:id/judge` - Evaluates drafts and produces critique
- `GET /api/sessions/:id` - Retrieves full session state

**AI Orchestration**: The server coordinates parallel OpenAI API calls for the three worker personas, then a sequential judge evaluation. Worker personas use gpt-4o-mini for cost efficiency, while the judge could use a more capable model for synthesis.

**Worker Personas**:
- Worker A (The Skeptic): Focuses on risks, inconsistencies, and critical analysis
- Worker B (The Visionary): Proposes creative, boundary-pushing solutions
- Worker C (The Realist): Emphasizes practical, immediately actionable steps

**Session Management**: Express-session with connect-pg-simple for PostgreSQL-backed sessions enables stateful interactions and user session persistence.

**Build Process**: Custom esbuild configuration bundles the server with selective dependency bundling (allowlist strategy) to optimize cold start times by reducing filesystem syscalls.

### Data Storage

**ORM**: Drizzle ORM provides type-safe database operations with PostgreSQL as the target dialect.

**Schema Design**:
- `sessions` table: Stores conversation metadata, current round, status, and final consensus
- `drafts` table: Stores individual worker responses per round with foreign key to sessions
- `evaluations` table: Stores judge critiques, scores, synthesis, and stop conditions per round
- `users` table: Basic user authentication support

**Database Provider**: Configured for Neon serverless PostgreSQL (@neondatabase/serverless driver) with connection pooling support.

**Migration Strategy**: Drizzle Kit handles schema migrations with the config pointing to `./migrations` output directory.

### Core Application Flow

1. **Session Initialization**: User submits a query, creating a new session record with status "thinking"
2. **Worker Drafting**: Three parallel OpenAI API calls generate initial responses from each persona
3. **Judge Evaluation**: Judge analyzes all drafts, assigns a consensus score (0-100), and provides specific critique
4. **Refinement Loop**: If score < threshold and rounds < max, critique is fed back to workers who regenerate responses
5. **Consensus**: When stopping condition is met, final synthesis is saved and displayed

### Authentication & Authorization

The schema includes a users table with password storage, suggesting planned authentication. The server uses express-session for session management, though authentication middleware is not yet fully implemented in the routes.

### Development Workflow

**Development Mode**: Vite dev server runs on port 5000 with HMR via `/vite-hmr` path. The server uses tsx for TypeScript execution without compilation.

**Production Build**: 
1. Vite builds the client to `dist/public`
2. esbuild bundles the server to `dist/index.cjs` with selective dependency bundling
3. Static file serving via Express serves the compiled client

**Replit Integration**: Custom Vite plugins handle Replit-specific features like runtime error modals, development banners, and OpenGraph meta image injection for deployed apps.

## External Dependencies

### AI Services
- **OpenAI API**: Primary LLM provider for all worker and judge responses. Requires `OPENAI_API_KEY` environment variable. The application uses gpt-4o-mini for workers and potentially gpt-4o for judge evaluations.

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database requiring `DATABASE_URL` environment variable. The connection uses the Neon serverless driver optimized for edge and serverless environments.

### UI Component Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible primitives including dialogs, dropdowns, tooltips, tabs, and form controls
- **Lucide React**: Icon library for consistent iconography
- **Embla Carousel**: Carousel/slider functionality
- **cmdk**: Command palette component (though not currently used in visible UI)

### Development & Build Tools
- **Vite**: Build tool and dev server with React plugin
- **Tailwind CSS v4**: Utility-first CSS framework with PostCSS integration
- **TypeScript**: Type safety across client and server with shared types in `/shared` directory
- **Drizzle Kit**: Database migration and schema management tool

### Form & Validation
- **React Hook Form**: Form state management
- **Zod**: Schema validation integrated with Drizzle for runtime type safety
- **@hookform/resolvers**: Zod resolver for React Hook Form

### Session Management
- **express-session**: Server-side session middleware
- **connect-pg-simple**: PostgreSQL session store adapter

### Animation & UX
- **Framer Motion**: Declarative animations for React components
- **class-variance-authority**: Type-safe component variant generation
- **clsx/tailwind-merge**: Utility for conditional className composition