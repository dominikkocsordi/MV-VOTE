// 'votes.delegation_names' kann je nach Spaltentyp unterschiedlich ankommen:
// als Array (jsonb / text[]), als JSON-Text oder als Postgres-Array-Literal
// ('{Anna,Max}'). Ein Parse-Fehler darf nicht das Laden aller Stimmen
// verhindern, deshalb wird im Zweifel null zurückgegeben.
export function parseDelegationNames(value: unknown): string[] | null {
  if (value === null || value === undefined || value === '') return null;

  if (Array.isArray(value)) {
    const names = value.map((n) => String(n).trim()).filter(Boolean);
    return names.length > 0 ? names : null;
  }

  if (typeof value === 'string') {
    const raw = value.trim();

    if (raw.startsWith('{') && raw.endsWith('}')) {
      // Postgres-Array-Literal, z.B. {"Anna Beispiel","Max Mustermann"}
      const names = raw
        .slice(1, -1)
        .split(',')
        .map((n) => n.trim().replace(/^"|"$/g, '').trim())
        .filter(Boolean);
      return names.length > 0 ? names : null;
    }

    try {
      return parseDelegationNames(JSON.parse(raw));
    } catch {
      console.warn("Unlesbare delegation_names:", value);
      return null;
    }
  }

  return null;
}
