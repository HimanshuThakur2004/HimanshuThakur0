# StoryFrame — Creator Portfolio + CMS Portal

A dark editorial documentary creator portfolio with an integrated full-featured CMS Portal, matching a modern creator studio aesthetic (hero monochrome gradient, expanding 5-card story formats accordion, monthly reach stats, partner brand marquee, interactive India dot-matrix map, courses/workshops catalog, behind-the-camera bento grid, photo-essays, and giant watermark footer).

## Quick Start (Zero Dependencies on Windows)

1. Double-click **`start.bat`** (or run in PowerShell):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start-server.ps1 -Port 8080
   ```
2. Open:
   - **Public Portfolio**: http://localhost:8080/
   - **CMS Portal**: http://localhost:8080/admin.html

> **Default CMS Login:** Username `admin` / Password `creator2026` (changeable inside **Contact & Security** in the CMS).

## How CMS Persistence Works

- **With `start-server.ps1` (Local Server Mode):** Edits made in `admin.html` save directly to `data/cms-content.json`, uploaded images are saved into `uploads/`, and visitor inquiries/course registrations are appended to `inquiries` in `data/cms-content.json`.
- **Static Hosting Mode (Vercel, Netlify, GitHub Pages):** Reads initial content from `data/cms-content.json` and stores CMS edits in browser `localStorage`, with one-click **Export JSON** / **Import JSON** to commit updated `data/cms-content.json` back to your repo.
