// Construit le site dans dist/ : TypeScript compilé (app.js, sw.js) + fichiers statiques.
//   npm run build   → build unique (utilisé par GitHub Actions pour le déploiement)
//   npm run dev     → rebuild à chaque modification + serveur local
// Node 24 exécute ce fichier .ts directement (suppression des types, sans compilation).
import * as esbuild from 'esbuild';
import { watch } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const OUT_DIR = 'dist';
const STATIC_FILES = [
  'styles.css',
  'manifest.json',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
];
/** Remplacé dans index.html par le script (compilé) qui applique le thème avant le premier affichage. */
const THEME_BOOT_PLACEHOLDER = '<!-- tally:theme-boot -->';

const dev = process.argv.includes('--watch');

const bundleOptions: esbuild.BuildOptions = {
  entryPoints: [
    { in: 'src/main.ts', out: 'app' },
    { in: 'src/sw/service-worker.ts', out: 'sw' },
  ],
  outdir: OUT_DIR,
  bundle: true,
  format: 'iife',
  target: 'es2020',
  // Les sources TypeScript restent lisibles dans les outils de développement du navigateur.
  sourcemap: 'linked',
  logLevel: 'info',
};

async function compileThemeBoot(): Promise<string> {
  const result = await esbuild.build({
    entryPoints: ['src/boot/theme-boot.ts'],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    minify: true,
    write: false,
  });
  return result.outputFiles[0].text.trim();
}

async function writeStaticFiles(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  await Promise.all(STATIC_FILES.map(file => cp(file, `${OUT_DIR}/${file}`)));

  const html = await readFile('index.html', 'utf8');
  if (!html.includes(THEME_BOOT_PLACEHOLDER)) {
    throw new Error(`index.html doit contenir ${THEME_BOOT_PLACEHOLDER}`);
  }
  const themeBoot = await compileThemeBoot();
  await writeFile(`${OUT_DIR}/index.html`, html.replace(THEME_BOOT_PLACEHOLDER, `<script>${themeBoot}</script>`));
}

await rm(OUT_DIR, { recursive: true, force: true });
await writeStaticFiles();

if (dev) {
  const ctx = await esbuild.context(bundleOptions);
  await ctx.watch();
  for (const file of ['index.html', 'src/boot/theme-boot.ts', ...STATIC_FILES]) {
    watch(file, () => {
      writeStaticFiles().catch(err => console.error(err));
    });
  }
  const { port } = await ctx.serve({ servedir: OUT_DIR });
  console.log(`\n  Tally : http://localhost:${port}/\n`);
} else {
  await esbuild.build(bundleOptions);
}
