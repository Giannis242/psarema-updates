'use strict';
// Back and Escape for the catch logger (js/catchlog.js sets PsCatchBack / PsCatchKey). Loaded before js/mobile.js: listeners on window run
// in the order they were added, so the logger steps back before mobile.js closes what lies under it.
addEventListener('popstate', e => window.PsCatchBack?.(e), true);
addEventListener('keydown', e => window.PsCatchKey?.(e), true);
