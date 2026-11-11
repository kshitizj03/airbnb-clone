export type Theme = "light" | "dark" | "system";

const DARK = "(prefers-color-scheme: dark)";

/**
 * Runs inline in <head> before first paint: reads the saved choice (default system), sets
 * data-theme on <html>, and follows the OS setting live while the choice is "system".
 */
export const themeScript = `(function(){var m=matchMedia("${DARK}");function a(){var t;try{t=localStorage.getItem("theme")}catch(e){}document.documentElement.dataset.theme=t==="dark"||(t!=="light"&&m.matches)?"dark":"light"}a();m.addEventListener("change",a)})()`;

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") return t;
  } catch {}
  return "system";
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem("theme", theme);
  } catch {}
  const dark = theme === "dark" || (theme === "system" && matchMedia(DARK).matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
