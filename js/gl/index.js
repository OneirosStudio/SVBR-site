/* SVBR® — point d'entrée WebGL (module)
   Expose window.SVBR_GL au script principal ; si WebGL est
   indisponible, le site garde ses transitions CSS d'origine. */
import { createHero } from "./hero.js";

const hasGL = (() => {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
  catch { return false; }
})();

if (hasGL) {
  window.SVBR_GL = { createHero };
  window.dispatchEvent(new Event("svbr:gl"));
}
