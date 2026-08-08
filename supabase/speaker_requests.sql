-- Redeliste (public.speaker_requests)
--
-- Passend zum bestehenden Schema:
--
--   id          uuid    not null default gen_random_uuid()  (PK)
--   first_name  text    not null
--   last_name   text    not null
--   type        text    not null default 'normal'   check (type in ('go','normal'))
--   created_at  timestamptz default now()
--   completed   boolean default false                -- Altlast, siehe Abschnitt 3
--   department  text
--   role        text
--   status      text    not null default 'queued'    -- 'queued' | 'speaking' | 'done'
--   started_at  timestamptz                          -- vom Trigger gesetzt
--   ended_at    timestamptz                          -- vom Trigger gesetzt
--
--   trigger speaker_requests_track_times before insert or update
--
-- Die App schreibt ausschließlich 'status'. started_at/ended_at bleiben Sache
-- des Triggers, die App fasst sie nicht an.
--
-- Häufigster Fehler: Eintragen und Anzeigen funktioniert, aber der Status
-- bleibt in der Datenbank auf 'queued'. Grund ist dann fast immer eine
-- fehlende UPDATE-Policy -- bei aktivem RLS liefert PostgREST für ein UPDATE
-- ohne passende Policy KEINEN Fehler zurück, es werden nur 0 Zeilen geändert.
-- Die App meldet das seit dieser Version in der Browser-Konsole.
--
-- Dieses Skript im Supabase SQL Editor ausführen. Es ist idempotent und kann
-- gefahrlos mehrfach laufen. Der SQL Editor führt alles in einer Transaktion
-- aus: bricht ein Statement ab, wird auch alles davor zurückgerollt.


-- 1) Gültige Statuswerte absichern -------------------------------------------
-- Analog zum bereits vorhandenen speaker_requests_type_check.
-- Schlägt fehl, falls noch andere Werte in der Tabelle stehen -- dann vorher:
--   select distinct status from public.speaker_requests;

alter table public.speaker_requests
  drop constraint if exists speaker_requests_status_check;

alter table public.speaker_requests
  add constraint speaker_requests_status_check
  check (status in ('queued', 'speaking', 'done'));


-- 2) Row Level Security --------------------------------------------------------
-- Die App läuft ohne Login, alle Zugriffe erfolgen mit der Rolle 'anon'.
-- Achtung: Diese Policies sind bewusst offen -- wer den Anon-Key hat, kann die
-- Redeliste lesen, ergänzen, ändern und leeren. Das entspricht dem bisherigen
-- Verhalten der App (Versammlungsbetrieb, keine Geheimnisse in der Tabelle).

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


-- 3) Spalte 'completed' ---------------------------------------------------------
-- Die App nutzt nur noch 'status'. Damit 'completed' nicht widersprüchlich
-- zurückbleibt (z.B. status='done' bei completed=false), eine der beiden
-- Varianten wählen:
--
-- Variante A -- Spalte entfernen (empfohlen, wenn nichts anderes sie liest).
--   Vorher prüfen, ob die Triggerfunktion speaker_requests_track_times() sie
--   verwendet:  select prosrc from pg_proc where proname = 'speaker_requests_track_times';
--
-- alter table public.speaker_requests drop column completed;
--
-- Variante B -- Spalte automatisch aus dem Status ableiten, falls noch etwas
-- anderes (Report, Export) darauf zugreift:
--
-- alter table public.speaker_requests drop column completed;
-- alter table public.speaker_requests
--   add column completed boolean generated always as (status = 'done') stored;


-- 4) Realtime ------------------------------------------------------------------
-- Damit alle Geräte den Statuswechsel sofort sehen.
-- Ein schlichtes "alter publication ... add table" wirft
-- "relation is already member of publication", sobald die Tabelle bereits
-- eingetragen ist. Da der SQL Editor das Skript in einer Transaktion ausführt,
-- würde dieser Fehler auch die Policies oben wieder zurückrollen -- deshalb
-- vorher prüfen.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'speaker_requests'
     )
  then
    alter publication supabase_realtime add table public.speaker_requests;
  end if;
end
$$;


-- 5) Prüfen --------------------------------------------------------------------
-- Erwartung: vier Zeilen (select/insert/update/delete) und realtime = true.

select
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'speaker_requests') as policies,
  (select string_agg(cmd, ', ' order by cmd) from pg_policies
    where schemaname = 'public' and tablename = 'speaker_requests') as befehle,
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'speaker_requests'
  ) as realtime;
