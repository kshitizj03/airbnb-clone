// Photo if we have one, else the first letter on a colour picked from the name (same name, same colour).
const COLORS = ["var(--color-avatar)", "#8a4b2f", "#2f6f8a", "#5b4a9b", "#2e7d4f", "#a23b5e"];

export function Avatar({ name, src, size }: { name: string; src: string | null; size: number }) {
  const color = COLORS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % COLORS.length];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
      className="flex shrink-0 items-center justify-center rounded-full font-medium text-white"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
