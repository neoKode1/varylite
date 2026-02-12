# vARYLite — Project Context

## What This Is
**vARYLite** is a free AI scene generator web app. Users generate images and videos
using 70+ AI models (Flux, Veo 3, MiniMax, Runway, Kling, etc.) with browser-based
storage — no sign-up required.

## Tech Stack (v2.0 — SvelteKit Migration)
- **Framework:** SvelteKit 5 with Svelte 5 Runes (`$state`, `$derived`, `$effect`)
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite` plugin, `@theme` directives in `src/app.css`)
- **Deploy:** Cloudflare Workers via `@sveltejs/adapter-cloudflare`
- **Build:** Vite 7, TypeScript
- **Domain:** varylite-089810c5.cubicubes.ai

## Previous Stack (v1.0 — removed)
Was Next.js 15 + React 19 + Supabase + Stripe. Original source in `src/app/` was
replaced during SvelteKit migration. Old Next.js config files removed.

## Project Structure
```
src/
├── app.css             # Global styles, Tailwind @theme, custom utilities
├── app.html            # HTML shell
├── lib/
│   ├── components/
│   │   ├── Nav.svelte      # Top nav bar (glassmorphism, mobile hamburger)
│   │   └── Footer.svelte   # Site footer
│   └── stores/
│       └── theme.svelte.ts # Dark mode store (Svelte 5 runes)
└── routes/
    ├── +layout.svelte       # Root layout (nav + footer)
    ├── +page.svelte         # Home — hero, features, stats, models, CTA
    ├── generate/+page.svelte # AI generation interface (prompt, model select, upload)
    ├── gallery/+page.svelte  # Masonry gallery with filters + fullscreen viewer
    ├── community/+page.svelte # Social feed + collaborators
    └── pricing/+page.svelte   # Tiers (Free/Light/Heavy) + credit packs + model costs
```

## Key Patterns
- **Custom CSS utilities:** `glass`, `glass-strong`, `gradient-text`, `glow-border`, `shimmer-bg` defined with `@utility` in `app.css`
- **Theme colors:** `surface-50` through `surface-950`, `accent-400/500/600` defined in `@theme`
- **Animations:** `animate-fade-in`, `animate-slide-up`, `animate-float`, `animate-pulse-glow`, `animate-blur-in`
- **No external component library** — all UI is hand-built with Tailwind
- **Static assets** in `static/` (copied from original `public/`)

## Build
```bash
pnpm install
pnpm build   # Builds SSR + client for Cloudflare Workers
```

## Important Notes
- The generate page currently has demo/simulated generation (uses picsum.photos placeholders). API integration needs to be wired up.
- Gallery page uses placeholder data; real gallery should load from localStorage or API.
- Community feed is static demo data.
- Payment/Stripe integration not yet migrated to SvelteKit.
