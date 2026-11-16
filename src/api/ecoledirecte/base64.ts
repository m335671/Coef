// Base64 UTF-8 sans dépendance (atob/btoa n'acceptent que du Latin-1).

export function decoderBase64(b64: string): string {
  const octets = atob(b64);
  let pourcents = '';
  for (let i = 0; i < octets.length; i++) pourcents += '%' + octets.charCodeAt(i).toString(16).padStart(2, '0');
  return decodeURIComponent(pourcents);
}

export function encoderBase64(texte: string): string {
  return btoa(encodeURIComponent(texte).replace(/%([0-9A-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16))));
}
