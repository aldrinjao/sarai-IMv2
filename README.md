# SARAI Interactive Maps v2

A Next.js web application for exploring satellite-derived agricultural and
environmental data over the Philippines. It renders Google Earth Engine (GEE)
map tiles on a Leaflet map, with three data layers:

- **NDVI** (`/api/ndvi`) — MODIS MOD13Q1 vegetation index, including a time
  series and multi-year calendar-day averages.
- **LULC** (`/api/lulc`) — ESRI Global Land Use / Land Cover (10 m).
- **Flood** (`/api/flood`) — Sentinel-1 SAR flood detection (before / after /
  difference / flooded views) using the UN-SPIDER methodology.

Administrative regions, provinces, and municipalities can be selected to focus
the analysis (boundaries come from GEE feature-collection assets).

## Tech stack

- Next.js 13.5 (Pages Router) + React 18
- Leaflet / react-leaflet for mapping
- Google Earth Engine (`@google/earthengine`) via API routes
- MUI, Chart.js, Sass

## Prerequisites

- Node.js 18 (see `.nvmrc`)
- A Google Earth Engine **service account** with a JSON key

## Setup

```bash
npm install
cp .env.example .env.local   # then paste your GEE service-account JSON
npm run dev                  # http://localhost:3000
```

Without a valid `GOOGLE_SERVICE_KEY` the app UI still loads, but every data
layer (NDVI / LULC / Flood) returns a 500 — see `.env.example` for how to
obtain the key.

## Scripts

| Command         | Description                    |
| --------------- | ------------------------------ |
| `npm run dev`   | Start the dev server           |
| `npm run build` | Production build               |
| `npm start`     | Serve the production build     |
| `npm run lint`  | Run ESLint (next lint)         |

## Deployment

Pushes to `main` deploy to a Digital Ocean droplet over SSH via PM2
(`.github/workflows/deploy.yml`, `ecosystem.config.js`). The `GOOGLE_SERVICE_KEY`
environment variable must be present on the server for the API routes to work.
