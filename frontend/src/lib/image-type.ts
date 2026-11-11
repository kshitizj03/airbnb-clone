// Same rule as the backend's _sniff (backend/app/routers/uploads.py): the file's first bytes
// decide its type, never its name or the browser's claim alone.
export function sniffImage(b: Uint8Array): { type: string; ext: string } | null {
  const starts = (sig: number[], at = 0) => sig.every((x, i) => b[at + i] === x);
  if (starts([0xff, 0xd8, 0xff])) return { type: "image/jpeg", ext: "jpg" };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { type: "image/png", ext: "png" };
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return { type: "image/webp", ext: "webp" }; // "RIFF" .... "WEBP"
  return null;
}
