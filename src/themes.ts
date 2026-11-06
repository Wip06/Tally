import { THEME_STORAGE_KEY } from './constants';

// Les couleurs d'interface de chaque thème (fond, surface, principal…) sont dans styles.css,
// sous [data-theme="…"]. Ici : ce que le code doit connaître (couleurs d'équipe, icône, libellés).

export const THEME_IDS = ['frappe', 'feutre', 'terrain', 'arcade', 'braise', 'carnet', 'contraste'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeIcon {
  from: string;
  to: string;
  bars: readonly [string, string, string];
  /** SVG supplémentaire dessiné sous les barres (motif, liseré…). */
  extra?: string;
  /** Halo lumineux sous les barres. */
  glow?: boolean;
}

export interface Theme {
  id: ThemeId;
  name: string;
  mood: string;
  /**
   * 12 couleurs d'équipe, dans le même ordre de teinte d'un thème à l'autre
   * (rouge, orange, jaune…) : en changeant de thème, chaque équipe garde sa « place » de couleur.
   */
  teamColors: readonly string[];
  icon: ThemeIcon;
}

export const THEMES: readonly Theme[] = [
  {
    id: 'frappe',
    name: 'Frappé',
    mood: "Le thème d'origine, pastel et doux.",
    teamColors: [
      '#e78284', '#ef9f76', '#e5c890', '#a6d189',
      '#81c8be', '#99d1db', '#85c1dc', '#8caaee',
      '#babbf1', '#ca9ee6', '#f4b8e4', '#eebebe',
    ],
    icon: { from: '#ca9ee6', to: '#8caaee', bars: ['#303446', '#232634', '#303446'] },
  },
  {
    id: 'feutre',
    name: 'Feutre',
    mood: 'Le tapis vert de la table de jeu.',
    teamColors: [
      '#e0604f', '#f08a3c', '#e2b13c', '#f2e2b0',
      '#8fd18a', '#5cc2b0', '#6fb3e8', '#4a7fd6',
      '#9b7ae0', '#d46aa8', '#f29fb0', '#c9a27a',
    ],
    icon: {
      from: '#1f5a45', to: '#0e3127', bars: ['#efe6d2', '#e2b13c', '#efe6d2'],
      extra: '<rect x="30" y="30" width="452" height="452" rx="86" fill="none" stroke="#e2b13c" stroke-opacity=".55" stroke-width="7" stroke-dasharray="1 16" stroke-linecap="round"/>',
    },
  },
  {
    id: 'terrain',
    name: 'Terrain',
    mood: 'Un court en plein jour. Thème clair.',
    teamColors: [
      '#e5383b', '#f77f00', '#f4c20d', '#2bb24c',
      '#0fa3a3', '#1f5fd1', '#16307a', '#7b3fe4',
      '#d6338a', '#ff7aa2', '#8d5a2b', '#5f6b7a',
    ],
    icon: {
      from: '#2a74e8', to: '#1646a6', bars: ['#ffffff', '#d4ec1e', '#ffffff'],
      extra: '<path d="M72 424H440" stroke="#ffffff" stroke-opacity=".55" stroke-width="12" stroke-linecap="round"/><path d="M256 72V128" stroke="#ffffff" stroke-opacity=".35" stroke-width="12" stroke-linecap="round"/>',
    },
  },
  {
    id: 'arcade',
    name: 'Arcade',
    mood: 'Des néons dans une salle sombre.',
    teamColors: [
      '#ff4f6d', '#ff8a3d', '#ffe14d', '#a6ff4d',
      '#3dffb5', '#3de0ff', '#4d9dff', '#8c6bff',
      '#d36bff', '#ff4fae', '#ff9ecf', '#c2f0ff',
    ],
    icon: {
      from: '#22164a', to: '#0d0920', bars: ['#ff4fae', '#3de0ff', '#ffe14d'], glow: true,
      extra: '<path d="M64 150H448M64 190H448M64 230H448" stroke="#ffffff" stroke-opacity=".05" stroke-width="6"/>',
    },
  },
  {
    id: 'braise',
    name: 'Braise',
    mood: 'Une soirée au coin du feu.',
    teamColors: [
      '#ff6b6b', '#ff8a5b', '#ffc857', '#f5e28a',
      '#b8e07a', '#6fd6b0', '#6cc4e0', '#7d9cf0',
      '#b18cf2', '#e57ad8', '#ff9fb8', '#e8b89a',
    ],
    icon: {
      from: '#ffb057', to: '#c9395a', bars: ['#2a1720', '#1c0f15', '#2a1720'],
      extra: '<circle cx="396" cy="118" r="20" fill="#fff3d6" opacity=".75"/><circle cx="440" cy="168" r="10" fill="#fff3d6" opacity=".5"/>',
    },
  },
  {
    id: 'carnet',
    name: 'Carnet',
    mood: 'La feuille de marque, au stylo bleu. Thème clair.',
    teamColors: [
      '#e03131', '#f76707', '#f59f00', '#37b24d',
      '#0ca678', '#1098ad', '#1c7ed6', '#2541b2',
      '#7048e8', '#ae3ec9', '#d6336c', '#495057',
    ],
    icon: {
      from: '#ffffff', to: '#e9edf6', bars: ['#2541b2', '#e03131', '#2541b2'],
      extra: '<path d="M0 128H512M0 192H512M0 256H512M0 320H512M0 384H512M0 448H512" stroke="#2541b2" stroke-opacity=".12" stroke-width="5"/><path d="M84 0V512" stroke="#e03131" stroke-opacity=".45" stroke-width="6"/>',
    },
  },
  {
    id: 'contraste',
    name: 'Contraste',
    mood: 'Lisible de loin, couleurs adaptées aux daltoniens.',
    // Okabe-Ito + Paul Tol : distinguables avec les daltonismes courants.
    teamColors: [
      '#d55e00', '#e69f00', '#f0e442', '#ddcc77',
      '#009e73', '#44aa99', '#999999', '#0072b2',
      '#56b4e9', '#cc79a7', '#882255', '#ffffff',
    ],
    icon: {
      from: '#111111', to: '#000000', bars: ['#ffffff', '#ffd400', '#ffffff'],
      extra: '<rect x="20" y="20" width="472" height="472" rx="94" fill="none" stroke="#ffd400" stroke-width="10"/>',
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'frappe';

export function isThemeId(value: unknown): value is ThemeId {
  return THEME_IDS.includes(value as ThemeId);
}

export function getTheme(id: ThemeId): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}

// ---------- Thème courant (préférence de l'appareil, hors des données de jeu) ----------

let current: Theme = getTheme(loadThemeId());

function loadThemeId(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(stored)) return stored;
  } catch {
    // Stockage indisponible (navigation privée…) : thème par défaut.
  }
  return DEFAULT_THEME_ID;
}

export function currentTheme(): Theme {
  return current;
}

export function setCurrentTheme(id: ThemeId): void {
  current = getTheme(id);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch (e) {
    console.warn("Impossible d'enregistrer le thème.", e);
  }
}

/** Couleurs proposées aux équipes avec le thème courant. */
export function teamPalette(): readonly string[] {
  return current.teamColors;
}

// ---------- Icône ----------

const ICON_BARS = [
  [120, 260, 140],
  [216, 190, 210],
  [312, 230, 170],
] as const;

/** Icône de l'app (SVG) aux couleurs d'un thème. */
export function themeIconSvg(theme: Theme): string {
  const { icon } = theme;
  const bars = icon.bars
    .map((fill, i) => {
      const [x, y, height] = ICON_BARS[i];
      return `<rect x="${x}" y="${y}" width="80" height="${height}" rx="16" fill="${fill}"/>`;
    })
    .join('');
  const glow = icon.glow ? `<g filter="url(#b)" opacity=".85">${bars}</g>` : '';
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${icon.from}"/><stop offset="1" stop-color="${icon.to}"/></linearGradient>` +
    '<filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>' +
    '<clipPath id="c"><rect width="512" height="512" rx="96"/></clipPath></defs>' +
    '<rect width="512" height="512" rx="96" fill="url(#g)"/>' +
    // Motifs et halo rognés à la forme de l'icône (sinon ils dépassent dans les coins arrondis).
    `<g clip-path="url(#c)">${icon.extra ?? ''}${glow}</g>${bars}</svg>`
  );
}
