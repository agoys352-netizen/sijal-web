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