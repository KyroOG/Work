# Work: productivity app

Windows desktop app (Electron wrapper in desktop/) with to-do, Pomodoro and alarms. GitHub: KyroOG/Work (public, MIT). Live site: kyroog.github.io/Work. Owner uses the Helium browser.

## Design
- Light, zen, Apple-like, minimal, clean. Calm, flow-state inducing, feels like an assistant, not a chore.
- Must NOT look AI-generated (run the anti-slop skill over look and copy).
- PC only, landscape desktop layout. Proper multi-file app, never a single hardcoded HTML file.
- Built for the public, not just me. Accent: whatever Apple would choose.

## Core flow
- Tasks sorted by priority and due date; Pomodoro works from the tasks; alarms are separate but always available.
- Tasks have a name (subject) and a description (what to do).

## Done
- Polish Parts 1-5 (bugs, task list, look and feel, alarm sounds and settings, Electron installer with GitHub Actions build on version tags, README, MIT license). v1.0.0 tag pushed.
- Focus Lock (closes games/launchers outside 3-4 pm on weekdays, runs in the Electron main process): engine, settings UI, alarm link, auto-update (electron-updater), website blocking (default: YouTube) all built and tested in the dev build.

## Next
1. Polish the Settings page look (more items coming from me).
2. Release: bump the version in desktop/package.json and js/core/utils.js, then tag.
3. Feedback list: alarm time picker digits get clipped and look small; better task-adding flow (set priority/due date right after adding); low-quality logo/icons; app scaling to 90%; window title should stay "Work" while the timer runs; faster task-completion animation; in-app update feature; run anti-slop over the whole project.
4. System tray + launch on startup so alarms always ring.

## Later / on hold
- Voice mode (on hold). Part 6: school websites + AI integration. Winget submission, optional code signing, recheck desktop shortcut icon corners.

## How to work with me
- I don't know git. Run git commands yourself and tell me exactly what you did; ask before pushing.
- Split big work into parts and do one at a time.
- Make targeted edits, not whole-file rewrites.
- At the end of each session, update the Done/Next sections of this file.

## Extra notes
- Build it like a full-scale production app from a big company, each part built carefully.
- "App" means a real Windows app: installable via winget/scoop or a downloadable .exe.
- Alarms use a custom 12-hour time field (not the native picker). The native sort dropdown looked bad in dark mode, so keep it custom.
- Focus Lock tray notice should show only once.
- The Work copy installed on my PC is older than the dev build; test new work in the dev build.
- Wants one way to add a task, collapsible completed tasks, and custom alarm sounds/songs (check whether these were already done before redoing).