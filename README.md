# Work

Tasks, a Pomodoro focus timer, and alarms — in one calm, Apple-style app.
No build step, no dependencies, no backend. Just open `index.html`.

## Structure

```
index.html
manifest.json       PWA metadata
sw.js                offline caching (service worker)
css/
  tokens.css         colors, type, spacing, motion
  base.css           reset + app shell layout
  icons.css           SVG icon set
  components.css     every UI component
js/
  core/              store, router, date parsing, events, utils
  services/          timer engine, alarm engine, audio, notifications, wake lock
  ui/                reusable sheet/toast/ring/editor components
  views/             the four screens: tasks, focus, alarms, settings
  app.js             boots everything, wires the tab bar
icons/               app icons (192/512, regular + maskable)
```

## Running it

Just open `index.html` in a browser — everything runs client-side with
`localStorage`. For the install-as-app (PWA) features to work (service
worker, notifications), serve it over `http(s)`, e.g. GitHub Pages, or
`npx serve` locally.

## Deploying on GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, folder
`/ (root)` → Save. It'll be live at `https://<username>.github.io/<repo>/`.
