// Gera dist/ a partir de src/: empacota e minifica JS/CSS (esbuild), adiciona hash nos nomes
// para cache longo, embute a URL da API no HTML e cria o _redirects (SPA).
import { cpSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'src');
const dist = resolve(root, 'dist');
const apiUrl = (process.env.API_URL ?? '').trim().replace(/\/$/, '');

if (!apiUrl) {
  console.warn('[aviso] API_URL não definida: o site chamará a API no mesmo domínio.');
} else if (!/^https?:\/\//.test(apiUrl)) {
  console.error('API_URL deve começar com http:// ou https://');
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
cpSync(src, dist, { recursive: true });

let jsPath = '/js/main.js';
let cssPath = '/css/styles.css';

try {
  const esbuild = await import('esbuild');
  rmSync(resolve(dist, 'js'), { recursive: true });
  rmSync(resolve(dist, 'css'), { recursive: true });

  const shared = {
    absWorkingDir: root,
    bundle: true,
    minify: true,
    metafile: true,
    entryNames: '[name]-[hash]',
    logLevel: 'warning',
  };
  const toUrl = (result) => '/' + Object.keys(result.metafile.outputs)[0].replace(/^dist\//, '');

  const js = await esbuild.build({
    ...shared,
    entryPoints: ['src/js/main.js'],
    outdir: 'dist/js',
    format: 'esm',
    target: 'es2022',
  });
  const css = await esbuild.build({ ...shared, entryPoints: ['src/css/styles.css'], outdir: 'dist/css' });
  jsPath = toUrl(js);
  cssPath = toUrl(css);
} catch (error) {
  console.warn('[aviso] esbuild indisponível; publicando arquivos sem minificar.', error.message);
}

const config = `<script>window.__CONNECTHUB__=${JSON.stringify({ API_URL: apiUrl })};</script>`;
const preconnect = apiUrl ? `<link rel="preconnect" href="${apiUrl}" crossorigin>` : '';

const page = readFileSync(resolve(src, 'index.html'), 'utf8')
  .replaceAll('/js/main.js', jsPath)
  .replaceAll('/css/styles.css', cssPath)
  .replace(/<script src="\/config\.js"><\/script>/, config)
  .replace('<!--preconnect-->', preconnect);

writeFileSync(resolve(dist, 'index.html'), page);
writeFileSync(resolve(dist, '_redirects'), '/*  /index.html  200\n'); // Netlify e Cloudflare Pages (SPA)
console.log(`Build concluído em dist/ (API_URL=${apiUrl || '(mesmo domínio)'})`);
