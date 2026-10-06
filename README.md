# Work

Tasks, a Pomodoro focus timer and alarms, in one calm app. No account, no cloud, no tracking:
everything is stored on your own computer.

**Use it:** https://kyroog.github.io/Work/ (works in any modern browser, installable as an app from Chrome or Edge)
**Windows app:** download `Work-Setup-x.y.z.exe` from the [Releases](../../releases) page.

## What it does

- **Tasks:** type naturally ("Report Friday 5pm !high"), sort by priority or due date, collapse completed ones.
- **Focus:** a Pomodoro timer tied to your tasks, with breaks and round tracking.
- **Alarms:** repeat days, snooze, ten built-in sounds, or your own audio files.
- **Themes:** light, dark, or follow the system.

Keyboard: `1`-`4` switch tabs, `N` or `/` adds a task, `Space` starts or pauses the timer.

> In the browser, alarms only ring while the tab is open. The Windows app lives in the tray and can start with Windows, so alarms ring even with the window closed (the PC must be awake).

## Privacy

Tasks, alarms and settings live in your browser or app storage on this device. Custom alarm sounds stay on this
device too. Nothing is sent anywhere. Use **Settings > Backup** to export or import your data.

## Run it locally

No build step. Serve the folder over http(s), for example `npx serve`, and open it.

## Build the Windows installer

Automatic: push a version tag and GitHub builds and publishes the installer.

```
git tag v1.0.0
git push origin v1.0.0
```

Manual, on a Windows PC with Node.js:

```
cd desktop
npm install
npm run dist
```

The installer appears in `desktop/dist/`. It is unsigned, so Windows SmartScreen may show a warning the first
time ("More info" > "Run anyway").

## Structure

```
index.html, manifest.json, sw.js   app shell, PWA, offline cache
css/                               tokens, base, icons, components
js/core/                           store, router, date parsing, theme, utils
js/services/                       timer, alarms, audio, custom sounds, notifications
js/ui/                             sheet, toast, select, time field, editors
js/views/                          tasks, focus, alarms, settings
desktop/                           Electron wrapper for the Windows installer
```

## License

MIT. Fonts (DM Sans, Fraunces) are under the SIL Open Font License.
