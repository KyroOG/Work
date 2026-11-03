# Work

Tasks, a Pomodoro focus timer and alarms, in one calm app. No account, no cloud, no tracking. Everything stays on your own computer.

**[Open it in your browser](https://kyroog.github.io/Work/)** · **[Download for Windows](../../releases/latest)** · [Changelog](../../releases)

Works in any modern browser and installs as an app from Chrome or Edge. The Windows app adds a tray icon, launch at startup, automatic updates and Focus Lock.

## What's in it

### Tasks
- Type naturally and the details are picked out for you: `Report Friday 5pm !high`, `Call mom tomorrow`, `Pay rent on 1 Dec`, `Dentist in 3 days p2`.
- Priority by `!`, `!!`, `!!!`, `!high`, `!med`, `!low` or `p1`–`p3`.
- Sort by Smart (overdue, then due soon, then priority), Priority, Due date or Manual. Smart groups tasks under Overdue, Today, Tomorrow, This week and Later.
- Notes, due date and time, and an estimate in Pomodoros for each task.
- Completed tasks collapse out of the way. Deleting or clearing can be undone.
- Press play on any task to start a focus session for it.

### Focus
- Pomodoro timer with a focus length, short break, long break and number of rounds you set.
- Breaks and the next focus session can start on their own.
- The countdown follows real time, so it stays correct when the tab is in the background or the PC sleeps.
- Keeps the screen on while you focus. A small timer sits in the sidebar when you are on another tab.
- Time and finished Pomodoros are counted per task.

### Stopwatch
- A simple count-up timer for when you do not know how long something will take.

### Alarms
- One-off or repeating on chosen days, with a label.
- Snooze for 5, 10, 15 or 30 minutes. A ringing alarm can stop by itself after a set time.
- Ten built-in sounds, all synthesised in the app. Or add your own audio files (up to 12, 10 MB each).
- Gentle wake-up raises the volume over 20 seconds.

### Themes
- Light, Dark or follow the system.
- Ten built-in colour themes: Dracula, Catppuccin (Latte, Frappé, Macchiato, Mocha), Nord, Gruvbox, Tokyo Night, Rosé Pine and Solarized Light.
- **Custom:** pick your own background, card, text and accent colours with a live preview. Or copy a colour scheme straight from Windows Terminal, so your terminal and your tasks match.

### Windows app extras
- **Tray and startup:** closing the window keeps Work running so alarms still ring (the PC must be awake). Optional launch when Windows starts.
- **Focus Lock:** closes games, launchers and chosen websites outside an allowed window. By default on weekdays they may run from 15:00 to 16:00, then you get a 30 second warning and they close. You choose the days, times, programs and sites.
- **Automatic updates** from GitHub Releases.
- **Interface size** from 80% to 125%.

### Keyboard
| Key | Action |
| --- | --- |
| `1`–`4` | Switch tabs |
| `N` | Add a task, or a new alarm on the Alarms tab |
| `/` | Jump to the quick-add bar |
| `Space` | Start or pause the timer on the Focus tab |

## Install

**Windows:** download `Work-Setup-x.y.z.exe` from the [latest release](../../releases/latest) and run it. The installer is not code-signed yet, so Windows SmartScreen may warn you the first time. Click *More info*, then *Run anyway*.

**Browser:** open the [web app](https://kyroog.github.io/Work/). In Chrome or Edge you can install it from the address bar.

In a browser, alarms only ring while the tab is open. Use the Windows app if alarms must ring with the window closed.

## Privacy

Tasks, alarms and settings live in your browser or app storage on this device. Custom alarm sounds stay on this device as well. Nothing is sent anywhere, there is no account, and there is no analytics. Use **Settings > Backup** to export or import your data. Custom sounds are not part of the backup.

## Run it locally

No build step. Serve the folder over http(s) and open it:

```
npx serve
```

## Build the Windows installer

On a Windows PC with Node.js:

```
cd desktop
npm install
npm run dist
```

The installer appears in `desktop/dist/`. To run the desktop app without installing it, use `npm start` in `desktop/`.

Pushing a version tag builds and publishes the installer through GitHub Actions:

```
git tag v1.3.0
git push origin v1.3.0
```

## Project layout

```
index.html, manifest.json, sw.js   app shell, PWA, offline cache
css/                               tokens, base, icons, components
js/core/                           store, router, date parsing, themes, utils
js/services/                       timer, alarms, audio, sounds, notifications
js/ui/                             sheet, toast, select, time field, editors
js/views/                          tasks, focus, alarms, settings
desktop/                           Electron wrapper: tray, Focus Lock, updater
```

The app is plain HTML, CSS and JavaScript with no framework and no dependencies. Fonts and icons are bundled, so it never needs the network.

## License

MIT, see [LICENSE](LICENSE). The fonts (DM Sans and Fraunces) are under the SIL Open Font License.
