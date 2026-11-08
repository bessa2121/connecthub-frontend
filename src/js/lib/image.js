// Reduz a foto no próprio navegador antes de enviar: recorte central na proporção pedida, sem ampliar,
// em WebP (ou JPEG como alternativa) abaixo do limite do servidor. Uma foto de celular de 5 MB vira ~60 KB.
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 430 * 1024;

export async function toDataUrl(file, { width, height, quality = 0.82 }) {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem (JPG, PNG ou WebP).');
  if (file.size > MAX_INPUT_BYTES) throw new Error('A imagem é muito grande (máximo de 15 MB).');

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Não foi possível ler essa imagem. Use JPG, PNG ou WebP.');
  }

  // recorte central na proporção desejada
  const ratio = width / height;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (sw / sh > ratio) sw = sh * ratio;
  else sh = sw / ratio;
  const sx = (bitmap.width - sw) / 2;
  const sy = (bitmap.height - sh) / 2;

  const scale = Math.min(1, width / sw);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext('2d').drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const encode = (q) => {
    const webp = canvas.toDataURL('image/webp', q);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', q);
  };
  let url = encode(quality);
  for (let q = quality - 0.1; url.length * 0.75 > MAX_OUTPUT_BYTES && q > 0.3; q -= 0.1) url = encode(q);
  if (url.length * 0.75 > MAX_OUTPUT_BYTES)
    throw new Error('Não foi possível reduzir a imagem o suficiente. Tente outra.');
  return url;
}
