/** Clé du localStorage. Ne pas la changer : les données existantes des utilisateurs en dépendent. */
export const STORAGE_KEY = 'score-counter-data-v1';

/** Clé du thème choisi. Aussi lue par src/boot/theme-boot.ts, injecté en tête d'index.html. */
export const THEME_STORAGE_KEY = 'tally-theme-v1';

/** Couleur de repli quand la couleur d'une équipe n'est pas un hexadécimal lisible par <input type="color">. */
export const FALLBACK_COLOR = '#babbf1';

export const DEFAULT_TIMER_MINUTES = 5;
export const MAX_HISTORY_ENTRIES = 20;
export const TEAM_NAME_MAX_LENGTH = 40;

export const UNDO_TIMEOUT_MS = 5000;
export const BANNER_TIMEOUT_MS = 3500;
export const CONFETTI_COUNT = 60;

/** Tennis : points pour gagner un jeu, avec 2 points d'écart. */
export const TENNIS_POINTS_PER_GAME = 4;
/** Tennis : jeux pour gagner un set, avec 2 jeux d'écart. */
export const TENNIS_GAMES_PER_SET = 6;
