/** Luminance relative (WCAG) d'une couleur #rgb ou #rrggbb ; `null` si illisible. */
export function luminance(color: string): number | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  const hex = match[1].length === 3 ? [...match[1]].map(c => c + c).join('') : match[1];
  const channels = [0, 2, 4].map(i => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Luminance d'un texte presque noir (#111). */
const DARK_TEXT_LUMINANCE = 0.0056;

/** Vrai si un texte foncé se lit mieux qu'un texte blanc sur ce fond. */
export function prefersDarkText(background: string): boolean {
  const l = luminance(background);
  if (l === null) return false;
  const darkContrast = (l + 0.05) / (DARK_TEXT_LUMINANCE + 0.05);
  const whiteContrast = 1.05 / (l + 0.05);
  return darkContrast >= whiteContrast;
}
