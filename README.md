# ScoutFlow MVP

MVP SaaS de scouting de fútbol (Next.js + Supabase + OpenAI Responses API).

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS (dark mode)
- Supabase (Postgres/Auth/RLS)
- OpenAI Responses API (server-only)

## Setup
1. Copia `.env.example` a `.env.local` y completa variables.
2. Instala dependencias: `npm install`
3. Ejecuta migraciones SQL en Supabase con `supabase/migrations/20260303190000_init.sql`.
4. (Opcional) aplica `supabase/seed.sql`.
5. Levanta local: `npm run dev`

## Rutas
- Auth: `/auth/login`, `/auth/signup`, `/auth/reset`
- Dashboard: `/`
- Players: `/players`, `/players/[id]`
- Matches: `/matches`, `/matches/[id]`
- Reports: `/reports`, `/reports/[id]`
- AI Studio: `/ai`
- Workspace settings: `/settings/workspace`

## Seguridad
- `OPENAI_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` solo en backend.
- RLS habilitado en tablas de negocio.
- Verificación de membresía de workspace en queries y endpoint IA.
- Rate-limit básico por usuario en `/api/ai/generate`.

## Deploy
Compatible con Vercel. Configura las mismas variables de entorno del `.env.example`.
