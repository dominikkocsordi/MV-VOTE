-- Redeliste (speaker_requests)
--
-- Der Status einer Wortmeldung wird ausschließlich über die Spalte 'status'
-- geführt: 'queued' | 'speaking' | 'done'.
--
-- Häufigster Fehler: Die App kann eintragen und lesen, aber der Status bleibt
-- in der Datenbank auf 'queued'. Grund ist dann fast immer eine fehlende
-- UPDATE-Policy: Bei aktivem RLS liefert PostgREST für ein UPDATE ohne
-- passende Policy KEINEN Fehler zurück, es werden nur schlicht 0 Zeilen
-- geändert. Die App meldet das seit dieser Version in der Konsole.
--
-- Dieses Skript im Supabase SQL Editor ausführen.


-- 1) Statusspalte sicherstellen ------------------------------------------------

alter table public.speaker_requests
  add column if not exists status text not null default 'queued';

-- Nur gültige Werte zulassen (schlägt fehl, wenn das Constraint schon existiert
-- oder noch alte Werte in der Tabelle stehen -- dann vorher aufräumen).
alter table public.speaker_requests
  drop constraint if exists speaker_requests_status_check;

alter table public.speaker_requests
  add constraint speaker_requests_status_check
  check (status in ('queued', 'speaking', 'done'));


-- 2) Row Level Security --------------------------------------------------------
-- Die App läuft ohne Login, alle Zugriffe erfolgen mit der Rolle 'anon'.
-- Achtung: Diese Policies sind bewusst offen -- wer den Anon-Key hat, kann die
-- Redeliste lesen, ergänzen, ändern und leeren. Das entspricht dem bisherigen
-- Verhalten der App (Versammlungsbetrieb, keine personenbezogenen Geheimnisse).

alter table public.speaker_requests enable row level security;

drop policy if exists "speaker_requests_select" on public.speaker_requests;
create policy "speaker_requests_select"
  on public.speaker_requests
  for select
  to anon, authenticated
  using (true);

drop policy if exists "speaker_requests_insert" on public.speaker_requests;
create policy "speaker_requests_insert"
  on public.speaker_requests
  for insert
  to anon, authenticated
  with check (true);

-- Ohne diese Policy bleibt der Status still auf 'queued' stehen.
drop policy if exists "speaker_requests_update" on public.speaker_requests;
create policy "speaker_requests_update"
  on public.speaker_requests
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- Für "Wortmeldung entfernen" und "Liste leeren".
drop policy if exists "speaker_requests_delete" on public.speaker_requests;
create policy "speaker_requests_delete"
  on public.speaker_requests
  for delete
  to anon, authenticated
  using (true);


-- 3) Realtime ------------------------------------------------------------------
-- Damit alle Geräte den Statuswechsel sofort sehen.

alter publication supabase_realtime add table public.speaker_requests;


-- 4) Prüfen --------------------------------------------------------------------
-- Erwartung: für select/insert/update/delete je eine Zeile.

-- select cmd, policyname from pg_policies
-- where schemaname = 'public' and tablename = 'speaker_requests';
