<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ecf6cd30-36a8-4d68-bb93-bfce022a3f12

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase (Redeliste)

Der Status einer Wortmeldung liegt in `speaker_requests.status`
(`queued` | `speaking` | `done`). Damit die Buttons der Redeleitung den Status
auch wirklich speichern, braucht die Tabelle eine **UPDATE-Policy** für die
Rolle `anon` — fehlt sie, ändert PostgREST bei aktivem RLS einfach 0 Zeilen und
meldet dabei *keinen* Fehler, der Status bleibt auf `queued` stehen.

Das passende Setup liegt in [supabase/speaker_requests.sql](supabase/speaker_requests.sql)
und wird einmalig im Supabase SQL Editor ausgeführt.
