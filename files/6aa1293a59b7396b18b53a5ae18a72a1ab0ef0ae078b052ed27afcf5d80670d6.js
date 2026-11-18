'use strict';
// Psarema's satellite imagery past the app's own tiles (tiles/tiles.js, Copernicus Sentinel-2 2025, z7-z14): ONE place for the whole app (the map,
// the catch log's mini map, the 3D area view; Offline areas and start-up never save or prefetch it). store/licences.md says why.
//
// PSAREMA_ESRI_KEY: an ArcGIS Location Platform API key whose ONLY privilege is Location services > Basemaps > Static basemap tiles
// (store/README.md, "Esri imagery key"). It is a PUBLIC client key, like every map key in an app: anyone can read it from the app, and all
// it can do is fetch basemap tiles on the owner's free tier. It is never a secret: never an account password, an admin key or a key with
// any other privilege. The owner pastes it between the quotes on the build PC (then `git update-index --skip-worktree js/map-config.js`
// keeps it out of commits). Empty: Esri's old keyless tiles, for testing only; the store builds refuse to start without a key
// (mobile/sync-web.mjs --release).
window.PSAREMA_ESRI_KEY = '';

window.PSAREMA_IMAGERY = (key => ({
  // url: '' turns the online imagery off everywhere (the app's own Sentinel-2 tiles then zoom on, softer), the other way out in store/licences.md.
  url: key ? `https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${encodeURIComponent(key)}`
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  credit: 'Esri, Vantor, Earthstar Geographics, and the GIS User Community', // the layer's own credit (World Imagery item, November 2026)
  powered: 'Powered by <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a>', // Esri's rule: on the map while its tiles show ('' if not Esri)
  from: 12.5, // round 17 M: the zoom it shows from, over the app's own tiles (sharper than their 10 m from here; as phones had it before round 17)
  offline: false, // Esri's terms: its tiles may not be saved for offline use (true only for an imagery whose licence allows it)
  keyed: !!key,
}))(String(window.PSAREMA_ESRI_KEY || '').trim());
