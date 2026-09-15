// Inlined into <head> in layout.tsx and run before first paint, so a
// stored "light"/"dark" choice applies immediately instead of flashing the
// OS-default theme for a frame. Absent or "system" leaves no data-theme
// attribute, falling back to the prefers-color-scheme rules in
// globals.css. Kept as a plain string (not a .tsx script component) since
// it must run synchronously, before React hydrates.
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
