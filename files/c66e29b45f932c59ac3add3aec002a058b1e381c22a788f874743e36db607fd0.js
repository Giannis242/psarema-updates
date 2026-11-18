'use strict';
// Psarema accounts: the owner's Supabase project (round11/accounts/SETUP.md, step 6 says where to find both values).
// Both values are PUBLIC by design: anyone can read them from the app. The anon ("publishable") key only lets a person reach their
// own rows and photos, because every table and the photo bucket has row-level security (round11/accounts/supabase.sql).
// NEVER put the service_role key or an sb_secret_… key here or anywhere in the app: js/cloud.js refuses one and turns accounts off.
// Left empty: no accounts. The app works as before, guest only, and the sign-in screen says accounts are not available yet.
window.PSAREMA_AUTH = {
  url: '',       // https://<project-ref>.supabase.co
  anonKey: '',   // Project Settings > API Keys: the "anon public" key (eyJ…) or the "publishable" key (sb_publishable_…)
  google: false, // true once the Google provider is switched on in Supabase (SETUP.md step 7): shows "Continue with Google"
  share: false,  // round 15: true once scripts/catches/share.sql has run in that project (store/README.md): shows "Share catches for science",
                 // an opt-in switch each angler turns on or not; with false, nothing of it shows and nothing is sent
};
