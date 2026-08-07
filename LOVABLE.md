# FSBS Abstimmungsportal – Funktions- und Datenmodell-Übersicht

Kontext-Dokument für Lovable (oder jedes andere Tool/Team, das die App nachbauen,
erweitern oder das Backend aufsetzen soll). Beschreibt den **Ist-Zustand** des Codes,
nicht einen Wunschzustand.

---

## 1. Was ist die App?

Ein Abstimmungs- und Redelisten-Portal für die **Mitgliederversammlung (MV) der
Fachschaft Business School e.V. (FSBS)**. Single-Page-App, deutschsprachig,
mobile-first. Zwei öffentliche Bereiche und ein verstecktes Admin-Panel:

| Tab | Sichtbar für | Zweck |
|---|---|---|
| **Wählen** | alle | An der aktuell freigegebenen Abstimmung teilnehmen |
| **Redeliste** | alle | Wortmeldung / GO-Antrag einreichen + Live-Redeliste sehen |
| **Sitzung** (Admin) | nur nach Freischaltung | Wahlgänge, Wählercodes und Redeleitung steuern |

Das Admin-Tab ist **nicht passwortgeschützt**, sondern per Easter Egg freigeschaltet:
**5× auf das Logo im Header tippen** → Tab „Sitzung" erscheint (`adminUnlocked`).
Das ist nur State im Browser, keine Auth.

---

## 2. Tech-Stack

- **Vite 6** + **React 18** + **TypeScript** (kein Router, kein State-Management-Lib)
- **Tailwind CSS v4** über `@tailwindcss/vite` (Konfiguration inline in `src/index.css` per `@theme`)
- **motion** (Framer Motion) für alle Übergänge
- **lucide-react** für Icons
- **@supabase/supabase-js** als einziges Backend (Postgres + Realtime)
- Kein Server-Code, keine Edge Functions, keine API-Routes — der Client spricht direkt mit Supabase.
- Ursprünglich ein Google-AI-Studio-Projekt (daher `metadata.json`, `GEMINI_API_KEY` in `.env.example`) — **Gemini wird im Code nirgends verwendet**.

### Dateien

```
index.html
src/main.tsx                      Mount-Point
src/App.tsx                       ⚠️ ~1360 Zeilen: kompletter State + gesamter Supabase-Layer
src/types.ts                      alle TypeScript-Interfaces
src/lib/supabase.ts               Client-Init + isSupabaseConfigured
src/index.css                     Tailwind-Theme, Farben, .premium-card, Grain-Overlay
src/components/VotingSection.tsx  Wahl-Flow (4 Schritte)
src/components/SpeakerSection.tsx Redelisten-Formular + Live-Liste
src/components/AdminSection.tsx   Admin mit 3 Unter-Tabs
src/components/FSBSLogo.tsx       (existiert, wird nicht mehr importiert)
public/logo.png                   Logo, mit Fallback-Platzhalter bei Ladefehler
```

### Environment-Variablen

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

`vite.config.ts` mappt zusätzlich `SUPABASE_URL` / `SUPABASE_ANON_KEY` (ohne `VITE_`-Präfix)
über `define` hinein. Fehlen die Werte, ist `isSupabaseConfigured === false` und die
App läuft komplett im **localStorage-Demo-Modus** mit Mock-Daten (2 Sitzungen,
3 Wortmeldungen, 2 Gruppen, 20 Codes, Demo-Code `FSB25`).

---

## 3. Design-System

- Schriften: **Plus Jakarta Sans** (sans), Playfair Display (serif), JetBrains Mono (mono) – via Google Fonts.
- Trick in `src/index.css`: Tailwinds **Indigo-Palette ist komplett mit dem FSBS-Orange
  überschrieben** (`--color-indigo-600: #e56934`). Im Markup steht überall `indigo-600`,
  gerendert wird Orange. Beim Nachbau unbedingt beachten, sonst wird alles blau.
- `.premium-card`: weiße Karte, 28px Radius, weicher Schatten, Hover-Lift.
- Bento-Layout, Blur-Lichtflecken im Hintergrund, feines Rausch-Overlay (`.grainy-overlay`).
- Footer verlinkt auf `https://fsbs-hm.de/privacy-policy/`.

---

## 4. Funktionsweise im Detail

### 4.1 Wählen (`VotingSection`)

Vier Schritte (`step`-State): `welcome → auth → options → success`.

1. **welcome** – Titel der offenen Abstimmung, Button „Jetzt wählen".
   Gibt es keine offene Abstimmung → Karte „Keine aktive Wahl" mit Link zur Redeliste.
2. **auth** – wird **übersprungen**, wenn `session.groupIds` leer ist (= Wahl offen für alle).
   Sonst: 5 einzelne Zeichen-Inputs (Auto-Focus vorwärts, Backspace rückwärts).
   Prüfung erfolgt **rein im Browser** gegen die Liste `voterCodes`, die vorher komplett
   aus Supabase geladen wurde: Code muss existieren **und** seine `groupId` muss in
   `session.groupIds` enthalten sein.
   Ein Code kann per URL vorbelegt werden: `?code=ABC12`.
3. **options** – Radio-Liste der Antwortoptionen. Wenn `allowDelegation` aktiv ist,
   zusätzlich **Stimmübertragungen**: Zähler 0–9, für jede Übertragung muss ein
   Name eingetragen werden (Pflichtfeld). Stimmgewicht = `1 + delegationCount`.
4. **success** – nach ~1,2 s künstlicher Verzögerung; Bestätigungs-Animation.

**Doppelwahl-Sperre:** Die IDs bereits gewählter Sitzungen liegen in
`localStorage['fsbs_voted_session_ids']`. Es gibt **keine serverseitige Prüfung** —
anderer Browser / Inkognito / Storage löschen = erneut wählbar.

### 4.2 Redeliste (`SpeakerSection`)

Links das Formular, rechts die Live-Liste.

- Pflichtfelder: **Vorname, Nachname**.
- Optional: **Ressort** (Interne Events, Externe Events, Merchandise, Sponsoring,
  Kommunikation) und **Rolle** (Vorstand, Ressortleiter, Ombudsperson, Alumnus) — feste
  Dropdown-Listen, im Code hart hinterlegt.
- **Art der Meldung**: `normal` (Wortmeldung) oder `go` (**Antrag zur Geschäftsordnung**,
  rot markiert, wird bevorzugt behandelt).
- Nach dem Absenden 4 s lang eine Erfolgskarte, dann zurück zum Formular.

**Sortierung der angezeigten Liste** (Einträge mit Status `done` werden ausgeblendet):
1. wer gerade spricht (`speaking`) ganz oben,
2. dann alle **GO-Anträge** nach Eingangszeit,
3. dann normale Wortmeldungen nach Eingangszeit.

### 4.3 Admin / „Sitzung" (`AdminSection`)

Drei Unter-Tabs:

**a) Wahlgänge verwalten**
- Neuer Wahlgang: Titel, Optionen (eine pro Zeile, min. 2), optionale Einschränkung
  auf Wählergruppen (Checkboxen; keine Auswahl = offen für alle),
  Toggle „Stimmübertragungen zulassen".
- Beim Anlegen werden **alle bisher offenen Sitzungen automatisch geschlossen** —
  es ist immer nur eine Abstimmung gleichzeitig aktiv.
- Liste der Wahlgänge mit **Live-Ergebnissen**: Balken pro Option, Summe der
  Stimm*gewichte* (nicht Anzahl Datensätze), Prozentwerte, Trophäen-Icon beim
  Gewinner geschlossener Wahlgänge. Aktionen: Schließen, Löschen.

**b) Wählergruppen & Codes**
- Gruppe anlegen: Name + Anzahl Codes (1–200). Codes werden clientseitig generiert:
  5 Zeichen aus `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (ohne I/O/0/1 zur Verwechslungs-Vermeidung).
- Code-Verzeichnis: Gruppe auswählen → alle Codes als Kacheln. **Klick auf einen Code**
  setzt `?code=XYZ12` in die URL und springt in den Wahl-Tab (Demo-/Präsentations-Feature).

**c) Redeleitung Live**
- Alle Wortmeldungen inkl. erledigter. Aktionen pro Eintrag:
  **Aufrufen** (`speaking` — der bisher sprechende Eintrag wird dabei automatisch auf
  `done` gesetzt), **Beenden** (`done`), **Entfernen** (Delete).
- „Liste leeren" löscht alle Wortmeldungen (mit `confirm()`-Rückfrage).

---

## 5. Datenmodell

### 5.1 TypeScript-Interfaces (`src/types.ts`)

```ts
VoteSession    { id, title, options: string[], status: 'open'|'closed',
                 groupIds: string[], allowDelegation: boolean, createdAt }
SpeakerRequest { id, firstName, lastName, department|null, role|null,
                 type: 'normal'|'go', status: 'queued'|'speaking'|'done',
                 completed?: boolean, createdAt }
VoterGroup     { id, name, createdAt }
VoterCode      { code, groupId }
Vote           { id, sessionId, optionIndex, voterCode|null, voterToken,
                 weight, delegationNames: string[]|null, createdAt }
```

### 5.2 Supabase-Tabellen

Der Code arbeitet mit **Fallback-Namen**: er versucht zuerst den primären Tabellennamen
und fällt bei Fehler auf einen Alternativnamen zurück. Ebenso probiert er beim Schreiben
snake_case- und camelCase-Spalten sowie Payloads mit und ohne `id` durch
(bis zu 8 Strategien pro Insert). Für einen sauberen Neuaufbau reicht die
**primäre Variante in snake_case**:

| Primäre Tabelle | Fallback | Inhalt |
|---|---|---|
| `sessions` | `vote_sessions` | Wahlgänge |
| `speaker_requests` | `speakers` | Wortmeldungen / GO-Anträge |
| `voter_groups` | `groups` | Wählergruppen |
| `voter_codes` | `codes` | Zugangscodes |
| `votes` | `voted` | Abgegebene Stimmen |

**Wichtig:** `options`, `group_ids` und `delegation_names` werden vom Client als
**JSON-String** geschrieben (`JSON.stringify(...)`), beim Lesen aber sowohl als Array
als auch als String akzeptiert. Sauberer wäre `jsonb` bzw. `text[]` — dann muss der
Client-Code beim Schreiben angepasst werden.

#### Empfohlenes Schema (SQL)

```sql
create table sessions (
  id               uuid primary key default gen_random_uuid(),
  title            text        not null,
  options          jsonb       not null,          -- ["Ja","Nein","Enthaltung"]
  status           text        not null default 'open',   -- 'open' | 'closed'
  group_ids        jsonb       not null default '[]',     -- [] = für alle offen
  allow_delegation boolean     not null default true,
  created_at       timestamptz not null default now()
);

create table voter_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null,
  created_at timestamptz not null default now()
);

create table voter_codes (
  code     text primary key,                       -- 5 Zeichen, A-Z/2-9 ohne I,O,0,1
  group_id uuid references voter_groups(id) on delete cascade
);

create table speaker_requests (
  id         uuid primary key default gen_random_uuid(),
  first_name text        not null,
  last_name  text        not null,
  department text,
  role       text,
  type       text        not null default 'normal', -- 'normal' | 'go'
  status     text        not null default 'queued', -- 'queued' | 'speaking' | 'done'
  completed  boolean     not null default false,
  created_at timestamptz not null default now()
);

create table votes (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid references sessions(id) on delete cascade,
  option_index     integer     not null,
  voter_code       text,
  voter_token      text,
  weight           integer     not null default 1,   -- 1 + Anzahl Stimmübertragungen
  delegation_names jsonb,
  created_at       timestamptz not null default now()
);
```

`status` und `completed` in `speaker_requests` sind **redundant** — der Client schreibt
beide und liest beide (`completed === true` ODER `status === 'done'` ⇒ erledigt).
Beim Neuaufbau eins davon streichen.

`voter_token` ist aktuell nur ein zufälliger String pro Stimmabgabe
(`token-<random>`), er identifiziert niemanden und verhindert nichts.

#### Realtime

Realtime muss für alle genutzten Tabellen aktiviert sein:

```sql
alter publication supabase_realtime add table sessions, speaker_requests, votes, voter_codes;
```

Die App abonniert vier Channels (`realtime:sessions`, `realtime:speakers`,
`realtime:votes`, `realtime:codes`) und lädt bei **jedem** Event die betroffene
Tabelle komplett neu (kein inkrementelles Update).

### 5.3 localStorage-Keys (Fallback-Modus + Wahl-Sperre)

| Key | Inhalt |
|---|---|
| `fsbs_sessions` | Wahlgänge (nur ohne Supabase) |
| `fsbs_speakers` | Wortmeldungen (nur ohne Supabase) |
| `fsbs_groups` | Wählergruppen (nur ohne Supabase) |
| `fsbs_codes` | Codes (nur ohne Supabase) |
| `fsbs_votes` | Stimmen (nur ohne Supabase) |
| `fsbs_voted_session_ids` | **immer aktiv** – verhindert Doppelwahl im selben Browser |

---

## 6. Bekannte Schwachstellen / Aufräumpunkte

Relevant, falls Lovable die App weiterbauen oder sauber neu aufsetzen soll:

1. **Keine Authentifizierung.** Das Admin-Panel ist per 5× Logo-Tap erreichbar. Jeder
   Besucher kann Wahlgänge anlegen, schließen, löschen und die Redeliste leeren —
   sofern die RLS-Policies das zulassen.
2. **Keine echte Wahlgeheimnis-/Integritätsgarantie.** `voter_code` wird zusammen mit
   der Stimme gespeichert (Stimme ist also einem Code zuordenbar), und der Client liest
   `select *` auf `votes` — mit einer offenen Read-Policy kann jeder alle Stimmen sehen.
3. **Code-Prüfung nur im Browser.** Die komplette Codeliste wird an jeden Client
   ausgeliefert; die Gültigkeitsprüfung passiert clientseitig. Gehört in eine
   RPC-Function/Edge Function.
4. **Doppelwahl-Sperre nur in localStorage** — serverseitig fehlt z.B. ein
   `unique(session_id, voter_code)`.
5. **`voterGroups` werden nie aus Supabase geladen.** Es gibt kein `fetchVoterGroups()`.
   Folge im Supabase-Modus: Die Gruppen-Checkboxen beim Anlegen eines Wahlgangs und das
   Code-Verzeichnis bleiben leer (Gruppen sind nur direkt nach dem Anlegen in derselben
   Session sichtbar — nach Reload weg). **Der wichtigste offene Bug.**
6. **`fetchActiveSession()` lädt nur `status = 'open'`.** Im Admin-Tab „Aktuelle
   Wahlgänge" erscheint deshalb höchstens **eine** Sitzung; geschlossene Wahlgänge und
   deren Ergebnisse sind nach dem Schließen nicht mehr einsehbar.
7. **Fallback-Strategie-Wildwuchs.** `App.tsx` enthält für jeden Schreibvorgang bis zu
   8 Payload-Varianten (snake/camel, mit/ohne id, zwei Tabellennamen) — historisch
   gewachsen, weil das Schema unklar war. Bei einem festen Schema kann das
   ersatzlos weg; die Datei schrumpft dadurch dramatisch.
8. **Ergebnisberechnung im Client** (`getSessionResults`) — lädt alle Stimmen und
   summiert lokal. Besser als View/RPC.
9. `App.tsx` ist ein einziger 1.360-Zeilen-Block aus State, Daten-Layer und UI.
   Für den Neuaufbau: Daten-Layer in Hooks (`useSessions`, `useSpeakers`, `useVotes`) trennen.
10. `FSBSLogo.tsx` ist toter Code; `README.md`, `metadata.json` und `GEMINI_API_KEY`
    stammen noch aus der AI-Studio-Vorlage und haben mit der App nichts zu tun.
