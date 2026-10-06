# Fu Jen imMBA website

A modern, mobile-first marketing site for Fu Jen Catholic University’s MBA Program in International Management. Visual language is inspired by Wise: high-contrast type, generous whitespace, lime CTAs, and a deep green ink color.

Content is adapted from the official program site:
https://www.management.fju.edu.tw/esubweb/immbaengindex/

## Run locally

```bash
npm install
npm run dev
```

Then visit the URL Vite prints (typically http://localhost:5173).

## Production build

```bash
npm run build
```

The deployable site is written to `dist/`. Preview it with `npm run preview`.

Netlify and Vercel pick up `npm run build` and the `dist` output automatically.
