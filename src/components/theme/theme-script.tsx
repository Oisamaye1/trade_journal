/**
 * Sets data-theme on <html> before first paint, from the "theme" cookie (light | dark | system).
 * A cookie (not localStorage) holds this purely presentational preference — CLAUDE.md rule 8.
 */
export const THEME_COOKIE = "theme";

const script = `(() => {
  try {
    var m = document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark|system)/);
    var pref = m ? m[1] : "system";
    var dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.themePref = pref;
  } catch (e) {}
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
