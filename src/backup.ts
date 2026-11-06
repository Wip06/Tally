import { isThemeId, type ThemeId } from './themes';
import type { Counter } from './types';

// Sauvegarde = texte JSON que l'on copie depuis une installation et colle dans une autre
// (nouvelle icône sur l'écran d'accueil, autre téléphone…).

const BACKUP_APP = 'tally';
const BACKUP_VERSION = 1;

interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  theme: ThemeId;
  counters: Counter[];
}

export function createBackup(counters: readonly Counter[], theme: ThemeId): string {
  const backup: BackupFile = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    theme,
    counters: [...counters],
  };
  return JSON.stringify(backup);
}

export type ParsedBackup =
  | { ok: true; counters: unknown[]; theme: ThemeId | null }
  | { ok: false; error: string };

const NOT_A_BACKUP =
  "Ce texte n'est pas une sauvegarde Tally. Copie-la à nouveau depuis l'autre app, en entier.";

/** Lit une sauvegarde collée. Accepte aussi le contenu brut du stockage local (`{ counters: [...] }`). */
export function parseBackup(text: string): ParsedBackup {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Colle d'abord une sauvegarde dans le champ." };

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (typeof data !== 'object' || data === null || !Array.isArray((data as { counters?: unknown }).counters)) {
    return { ok: false, error: NOT_A_BACKUP };
  }

  const { counters, theme, version } = data as { counters: unknown[]; theme?: unknown; version?: unknown };
  if (typeof version === 'number' && version > BACKUP_VERSION) {
    return { ok: false, error: "Cette sauvegarde vient d'une version plus récente de Tally. Mets l'app à jour, puis réessaie." };
  }
  return { ok: true, counters, theme: isThemeId(theme) ? theme : null };
}
