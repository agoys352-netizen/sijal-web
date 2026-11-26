# SIJAL Web
Sistem Inventarisasi Jalan — aplikasi survei inventarisasi perlengkapan jalan.

## Stack
- React + TypeScript + Vite
- Supabase (Auth, PostgreSQL, Storage, Realtime)
- Leaflet mapping
- GitHub Pages deployment

## Local development
1. Install Node.js 22+
2. `npm install`
3. `npm run dev`

## Build
`npm run build`

## Deployment
GitHub Actions builds and deploys the site to GitHub Pages on pushes to `main`.
In repository Settings → Pages, set source to **GitHub Actions**.

## Environment
Create `.env.local` from `.env.example`. Use only Supabase publishable/anon key in browser. Never expose service_role key.

## Project stages
Sprint 0 infrastructure/security audit · Sprint 1 foundation · Sprint 2 mapping · Sprint 3 dashboard/collaboration · Sprint 4 exports · Sprint 5 final QA.

## Deployment note
Deployment is handled by GitHub Actions workflow `.github/workflows/deploy.yml`. Ensure repository Settings → Pages → Source is set to GitHub Actions.

## Current implementation status
- [x] Supabase Auth sign-up/sign-in/sign-out
- [x] Session Hub list of sessions associated with the signed-in user
- [x] Create survey session (road/intersection type, metadata, segment list, date, weather)
- [x] Join a session using the session code
- [ ] Survey map, GPS, equipment-point editor, photos and live sync
- [ ] Recap/dashboard, export and offline KMZ

## Frontend Supabase configuration
Production build reads `.env.production`. It contains the Supabase project URL and **publishable/anon key only**. This key is expected to be public in browser applications. Do not place service-role or secret keys in frontend files. Row-level security is required to protect the database.
