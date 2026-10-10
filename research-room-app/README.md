# Research Room

A collaborative thesis proposal workspace for student research teams.

## Features
- Supabase email/password sign-in and account registration
- Create a research workspace or join with a private code
- Edit and save thesis proposal sections
- Create, assign, update, and delete tasks
- Plan meetings and store shared notes
- Group chat shared across workspace members
- Manage thesis title, institution, and degree program

## Architecture

The frontend is React + Vite + TypeScript. Authentication and persistent data use the shared Supabase project `ldsjdsgzqcawuhrnbvkq` (currently named `puvguard`). AppDeploy and Vercel builds can use this same Supabase backend.

The database contains `research_workspaces`, `research_members`, `research_sections`, `research_tasks`, `research_meetings`, and `research_messages`. Row Level Security is enabled on these tables. Workspace creation and joining use protected database RPC functions.

Only the Supabase publishable key is used in the browser. Never add a Supabase secret/service-role key to frontend code or `VITE_*` environment variables.

## Local development

```bash
npm install
npm run dev
```

Optional build-time environment variables:

- `VITE_SUPABASE_URL=https://ldsjdsgzqcawuhrnbvkq.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key`

The source includes public fallback values for the current Supabase project so the AppDeploy build and a default Vercel build can connect immediately. Environment variables override those values.

## Deploy on Vercel

1. Import GitHub repository [ace866678/-app-dev](https://github.com/ace866678/-app-dev).
2. Set **Root Directory** to `research-room-app`.
3. Use **Vite** with Build Command `npm run build` and Output Directory `dist`.
4. Add the two optional environment variables above under Project Settings → Environment Variables, then redeploy.
5. In Supabase Dashboard → Authentication → URL Configuration, add the AppDeploy origin `https://research-room-41f5cr.v2.appdeploy.ai` and the actual Vercel production URL to the allowed Redirect URLs. The app sends email-confirmation links back to the origin where account registration began.

Both deployments then share accounts, workspaces, tasks, meetings, document sections, and chat data through the same Supabase project.

## Live AppDeploy deployment

https://research-room-41f5cr.v2.appdeploy.ai/

## Important migration note

This switch does not automatically copy any records that might have been stored in AppDeploy's original database. New records are stored in Supabase. Before submitting the thesis, verify required approval pages, signatures, CVs, school formatting, and reference style with the institution.
