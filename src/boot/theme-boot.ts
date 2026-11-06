// Applique le thème enregistré avant le premier affichage, pour éviter un flash de l'ancien thème.
// Compilé et injecté directement dans le <head> de index.html par scripts/build.ts.
import { THEME_STORAGE_KEY } from '../constants';

try {
  const theme = localStorage.getItem(THEME_STORAGE_KEY);
  if (theme) document.documentElement.setAttribute('data-theme', theme);
} catch {
  // Stockage indisponible (navigation privée…) : thème par défaut.
}
