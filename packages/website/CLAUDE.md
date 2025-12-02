# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a TanStack Start full-stack React application with the following key architectural patterns:

### Tech Stack

- **Framework**: TanStack Start (full-stack React framework)
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Authentication**: Better Auth with email/password authentication
- **Styling**: Tailwind CSS with Radix UI components
- **File Storage**: AWS S3/R2 with presigned URL uploads
- **Payments**: Stripe integration for subscriptions
- **TypeScript**: Full type safety throughout

### Project Structure

- `src/routes/` - File-based routing with TanStack Router
- `src/components/` - Reusable React components with `ui/` subfolder for base components
- `src/db/` - Database configuration and schema definitions
- `src/data-access/` - Data access layer functions
- `src/fn/` - Business logic functions and middleware
- `src/hooks/` - Custom React hooks for data fetching and state management
- `src/queries/` - TanStack Query definitions for server state
- `src/utils/` - Utility functions and helpers
- `src/use-cases/` - Application use cases and business logic

### Database Schema

Core entities: `user`, `song`, `playlist`, `heart` (likes), with subscription and authentication tables. Users can upload songs, create playlists, and have subscription plans (free/basic/pro).

### Key Patterns

- **Data Fetching**: Uses TanStack Query with custom hooks pattern
- **Authentication**: Better Auth with session management
- **File Uploads**: Presigned URLs for direct S3/R2 uploads
- **Subscriptions**: Stripe-based with plan limits enforcement
- **Type Safety**: Full TypeScript with Drizzle ORM schema inference

## Common Development Commands

```bash
# Development
npm run dev                 # Start development server on port 3000
npm run build              # Build for production (includes type checking)
npm run start              # Start production server

# Database
npm run db:up              # Start PostgreSQL Docker container
npm run db:down            # Stop PostgreSQL Docker container
npm run db:migrate         # Run database migrations
npm run db:generate        # Generate new migration files
npm run db:studio          # Open Drizzle Studio for database management

# Payments (if needed)
npm run stripe:listen      # Listen for Stripe webhooks in development
```

## Environment Setup

1. Copy `.env.example` to `.env` and configure:
   - Database connection (PostgreSQL)
   - Better Auth secrets
   - Stripe keys (for payments)
   - AWS S3/R2 credentials (for file storage)

2. Start database and run migrations:
   ```bash
   npm run db:up
   npm run db:migrate
   ```

## Development Notes

- Uses TanStack Start's file-based routing system
- Database schema uses UUIDs for primary keys
- File uploads go directly to cloud storage via presigned URLs
- Subscription plans control feature access (playlists, upload limits)
- Build process includes TypeScript type checking

## Additional Information

- **Authentication** - please see `docs/authentication.md` for information about how authentication is setup on this project.
- **architecture** - please see `docs/architecture.md` for information about how the code is setup in a layered architecture on this project.
- **subscriptions** - please see `docs/subscriptions.md` for learn about how user plans and subscriptions are setup.
- **tanstack** - please see `docs/tanstack.md` for techincal implenetation detail on how to create tanstack start routes or server functions.
- **ux** - please see `docs/ux.md` for user experience guidelines to make sure this app feels consistent.
- **file-uploads** - please see `docs/file-uploads.md` for more information about how file uploads work in our code base
