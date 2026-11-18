'use strict';
Object.assign(I18N.en, {
  ac_title: 'Create profile', ac_edit: 'Edit profile', ac_hello: 'Create your angler profile',
  ac_helloSub: 'Your catches, species and personal bests in one profile, with your name and photo.',
  ac_local: 'Your profile is stored on this phone.', ac_cloud: 'Sign in from Me and it is kept in your account too, on all your phones.', ac_inAcct: 'Your profile is kept in your account and on this phone.',
  ac_b1: 'A profile with your photo, home area and how you fish', ac_b2: 'Your catches, species and personal bests counted for you', ac_b3: 'Your favourite fish and home area, a tap away', ac_prof: 'Profile',
  ac_start: 'Get started', ac_later: 'Not now', ac_next: 'Continue', ac_back: 'Back', ac_skip: 'Skip', ac_save: 'Save', ac_cancel: 'Cancel', ac_stepOf: (a, b) => `Step ${a} of ${b}`,
  ac_nameQ: 'What should we call you?', ac_nameSub: 'Your name and username show on your profile and on catches you share.',
  ac_name: 'Display name', ac_user: 'Username', ac_userHint: '3–20 characters: letters, digits, dot and underscore',
  ac_errName: 'Type a name (up to 40 characters).', ac_errUser: 'Use 3–20 letters, digits, . or _ (no spaces).',
  ac_photoQ: 'Add a profile photo', ac_photoSub: 'A square photo for your profile. It stays on this phone.', ac_cam: 'Take a photo', ac_gal: 'Choose from gallery', ac_rmPhoto: 'Remove photo', ac_photoErr: 'That picture could not be read.',
  ac_areaQ: 'Where do you fish most?', ac_areaSub: 'Your home area. You can change it any time.', ac_area: 'Home area',
  ac_styleQ: 'How do you fish?', ac_styleSub: 'Pick all that apply.', ac_style: 'How you fish',
  ac_fishQ: 'Your favourite fish', ac_fishSub: 'Pick the fish you go for most.', ac_fish: 'Favourite fish',
  ac_doneT: n => `Welcome aboard, ${n}!`, ac_doneSub: 'Your profile is ready. Log a catch and it shows up on your profile.', ac_toProfile: 'Go to my profile', ac_logCatch: 'Log a catch',
  ac_photo: 'Profile photo', ac_del: 'Delete profile', ac_delSub: 'Removes your profile and its photo from this phone.',
  ac_delQ: 'Delete your profile?', ac_delTxt: 'Your profile and photo are removed from this phone. Your catches stay unless you tick the box.',
  ac_delCatches: 'Also delete my catches (cannot be undone)', ac_delYes: 'Delete profile', ac_deleted: 'Profile deleted', ac_saved: 'Profile saved',
  ac_offerT: 'Create your angler profile', ac_offerSub: 'Stored on this phone · takes a minute', ac_create: 'Create',
  // round 11: online accounts (js/cloud.js), the sign-in screen below and the Me page's Account rows (js/me.js)
  cl_tag: 'Where and when fish bite around Cyprus.', cl_in: 'Sign in', cl_up: 'Create account', cl_email: 'Email', cl_pw: 'Password', cl_pwShow: 'Show password',
  cl_pwRule: 'At least 8 characters, with a letter and a number.', cl_accept: 'I accept the', cl_privacy: 'privacy policy', cl_doIn: 'Sign in', cl_doUp: 'Create account',
  cl_link: 'Email me a sign-in link instead', cl_or: 'or', cl_google: 'Continue with Google', cl_guest: 'Continue as guest', cl_close: 'Not now',
  cl_checkT: 'Check your email', cl_checkSub: e => `We sent a message to ${e}. Tap its link on this phone, or type the code from it here.`, cl_code: 'Code from the email',
  cl_confirm: 'Confirm', cl_resend: 'Send it again', cl_sent: 'Sent again', cl_other: 'Use another email',
  cl_askT: 'Add this phone’s data to your account?', cl_askSub: list => `On this phone, not in your account yet: ${list}. Once added, they sync to your other phones.`,
  cl_nCatch: n => n === 1 ? '1 catch' : `${n} catches`, cl_nPlace: n => n === 1 ? '1 saved place' : `${n} saved places`, cl_askYes: 'Add them', cl_askNo: 'Not now',
  cl_offT: 'Accounts are not available yet', cl_offSub: 'Everything works without one: your catches, photos and places stay on this phone.', cl_ok: 'OK',
  cl_hello: e => `Signed in as ${e}`, cl_bye: 'Signed out', cl_ended: 'You were signed out. Sign in again from Me.',
  cl_eCred: 'Wrong email or password.', cl_eConfirm: 'Confirm your email first: open the link we sent you, or type its code.', cl_eRate: 'Too many tries. Wait a few minutes, then try again.',
  cl_eExists: 'An account with this email already exists. Sign in instead.', cl_eWeak: 'That password is too weak. Use at least 8 characters, with letters and numbers.',
  cl_eExpired: 'That code or link has expired. Ask for a new one.', cl_eOffline: 'No connection. Try again when you are online.', cl_eOther: 'Your email is confirmed. Sign in here with your password.',
  cl_eNoUser: 'There is no account with this email yet. Create one first.', cl_eNoSignup: 'New accounts are closed for now.', cl_eEmail: 'Type a valid email address.', cl_ePw: 'Type your password.',
  cl_eAccept: 'Tick the box to accept the privacy policy.', cl_eCode: 'Type the code from the email.', cl_eWrongCode: 'That code is not right. Check it, or ask for a new one.',
  cl_eFail: s => `Something went wrong${s ? ` (${s})` : ''}. Try again.`,
  cl_acct: 'Account', cl_signin: 'Sign in or create an account', cl_signinSub: 'Your catches and places on all your phones', cl_offRow: 'Accounts are not available yet',
  cl_synced: r => `Synced ${r}`, cl_now: 'just now', cl_syncing: 'Syncing…', cl_never: 'Not synced yet', cl_offline: n => n ? `Offline · ${n === 1 ? '1 change' : n + ' changes'} waiting` : 'Offline',
  cl_paused: 'Sync is off on this phone', cl_syncNow: 'Tap to sync now', cl_addRow: 'Add this phone’s data to your account', cl_errSync: 'Sync failed. It tries again later.', cl_errAuth: 'Sign in again to sync',
  cl_export: 'Export my data', cl_exportSub: 'One file: catches, photos, places and profile', cl_out: 'Sign out', cl_del: 'Delete my account and data', cl_delSub: 'From the server, for good',
  cl_delT: 'Delete your account?', cl_delTxt: 'Your account, and every catch, photo, saved place and profile in it, are deleted from the server for good. This cannot be undone.',
  cl_delLocal: 'Also delete the catches and profile on this phone', cl_delYes: 'Delete for good', cl_delDone: 'Your account and its data are deleted',
  cl_cloudNote: 'Your profile, catches, photos and saved places are kept in your account (on servers in the EU) and on this phone. Settings stay on this phone.',
});
Object.assign(I18N.el, {
  ac_title: 'Δημιουργία προφίλ', ac_edit: 'Επεξεργασία προφίλ', ac_hello: 'Φτιάξτε το προφίλ ψαρά σας',
  ac_helloSub: 'Οι ψαριές, τα είδη και τα ρεκόρ σας σε ένα προφίλ, με το όνομα και τη φωτογραφία σας.',
  ac_local: 'Το προφίλ σας αποθηκεύεται σε αυτό το τηλέφωνο.', ac_cloud: 'Αν συνδεθείτε από το Προφίλ, φυλάσσεται και στον λογαριασμό σας, σε όλα σας τα τηλέφωνα.', ac_inAcct: 'Το προφίλ σας φυλάσσεται στον λογαριασμό σας και σε αυτό το τηλέφωνο.',
  ac_b1: 'Ένα προφίλ με τη φωτογραφία σας, την περιοχή σας και πώς ψαρεύετε', ac_b2: 'Οι ψαριές, τα είδη και τα ρεκόρ σας μετρημένα για εσάς', ac_b3: 'Τα αγαπημένα σας ψάρια και η περιοχή σας, με ένα άγγιγμα', ac_prof: 'Προφίλ',
  ac_start: 'Ξεκινήστε', ac_later: 'Όχι τώρα', ac_next: 'Συνέχεια', ac_back: 'Πίσω', ac_skip: 'Παράλειψη', ac_save: 'Αποθήκευση', ac_cancel: 'Άκυρο', ac_stepOf: (a, b) => `Βήμα ${a} από ${b}`,
  ac_nameQ: 'Πώς να σας λέμε;', ac_nameSub: 'Το όνομα και το όνομα χρήστη φαίνονται στο προφίλ σας και στις ψαριές που μοιράζεστε.',
  ac_name: 'Όνομα', ac_user: 'Όνομα χρήστη', ac_userHint: '3–20 χαρακτήρες: λατινικά γράμματα, ψηφία, τελεία και κάτω παύλα',
  ac_errName: 'Γράψτε ένα όνομα (έως 40 χαρακτήρες).', ac_errUser: 'Χρησιμοποιήστε 3–20 λατινικά γράμματα, ψηφία, . ή _ (χωρίς κενά).',
  ac_photoQ: 'Προσθέστε φωτογραφία προφίλ', ac_photoSub: 'Μια τετράγωνη φωτογραφία για το προφίλ σας. Μένει σε αυτό το τηλέφωνο.', ac_cam: 'Τραβήξτε φωτογραφία', ac_gal: 'Επιλογή από τη συλλογή', ac_rmPhoto: 'Αφαίρεση φωτογραφίας', ac_photoErr: 'Η εικόνα δεν διαβάστηκε.',
  ac_areaQ: 'Πού ψαρεύετε συνήθως;', ac_areaSub: 'Η περιοχή σας. Την αλλάζετε όποτε θέλετε.', ac_area: 'Περιοχή',
  ac_styleQ: 'Πώς ψαρεύετε;', ac_styleSub: 'Επιλέξτε όσα ισχύουν.', ac_style: 'Πώς ψαρεύετε',
  ac_fishQ: 'Τα αγαπημένα σας ψάρια', ac_fishSub: 'Επιλέξτε τα ψάρια που ψαρεύετε πιο συχνά.', ac_fish: 'Αγαπημένα ψάρια',
  ac_doneT: n => `Καλώς ήρθατε, ${n}!`, ac_doneSub: 'Το προφίλ σας είναι έτοιμο. Καταγράψτε μια ψαριά και θα φανεί στο προφίλ σας.', ac_toProfile: 'Στο προφίλ μου', ac_logCatch: 'Καταγραφή ψαριάς',
  ac_photo: 'Φωτογραφία προφίλ', ac_del: 'Διαγραφή προφίλ', ac_delSub: 'Αφαιρεί το προφίλ και τη φωτογραφία του από αυτό το τηλέφωνο.',
  ac_delQ: 'Διαγραφή του προφίλ σας;', ac_delTxt: 'Το προφίλ και η φωτογραφία σας αφαιρούνται από αυτό το τηλέφωνο. Οι ψαριές σας μένουν, εκτός αν τσεκάρετε το κουτί.',
  ac_delCatches: 'Διαγραφή και των ψαριών μου (δεν αναιρείται)', ac_delYes: 'Διαγραφή προφίλ', ac_deleted: 'Το προφίλ διαγράφηκε', ac_saved: 'Το προφίλ αποθηκεύτηκε',
  ac_offerT: 'Φτιάξτε το προφίλ ψαρά σας', ac_offerSub: 'Αποθηκεύεται σε αυτό το τηλέφωνο · ένα λεπτό', ac_create: 'Δημιουργία',
  cl_tag: 'Πού και πότε τσιμπά το ψάρι στην Κύπρο.', cl_in: 'Σύνδεση', cl_up: 'Νέος λογαριασμός', cl_email: 'Email', cl_pw: 'Κωδικός', cl_pwShow: 'Εμφάνιση κωδικού',
  cl_pwRule: 'Τουλάχιστον 8 χαρακτήρες, με ένα γράμμα και έναν αριθμό.', cl_accept: 'Αποδέχομαι την', cl_privacy: 'πολιτική απορρήτου', cl_doIn: 'Σύνδεση', cl_doUp: 'Δημιουργία λογαριασμού',
  cl_link: 'Στείλτε μου σύνδεσμο σύνδεσης με email', cl_or: 'ή', cl_google: 'Συνέχεια με Google', cl_guest: 'Συνέχεια ως επισκέπτης', cl_close: 'Όχι τώρα',
  cl_checkT: 'Δείτε το email σας', cl_checkSub: e => `Στείλαμε μήνυμα στο ${e}. Πατήστε τον σύνδεσμό του σε αυτό το τηλέφωνο ή γράψτε εδώ τον κωδικό που περιέχει.`, cl_code: 'Κωδικός από το email',
  cl_confirm: 'Επιβεβαίωση', cl_resend: 'Αποστολή ξανά', cl_sent: 'Στάλθηκε ξανά', cl_other: 'Άλλο email',
  cl_askT: 'Να μπουν στον λογαριασμό σας τα δεδομένα αυτού του τηλεφώνου;', cl_askSub: list => `Σε αυτό το τηλέφωνο, όχι ακόμη στον λογαριασμό σας: ${list}. Μόλις προστεθούν, συγχρονίζονται και στα άλλα σας τηλέφωνα.`,
  cl_nCatch: n => n === 1 ? '1 ψαριά' : `${n} ψαριές`, cl_nPlace: n => n === 1 ? '1 αποθηκευμένο σημείο' : `${n} αποθηκευμένα σημεία`, cl_askYes: 'Προσθήκη', cl_askNo: 'Όχι τώρα',
  cl_offT: 'Οι λογαριασμοί δεν είναι ακόμη διαθέσιμοι', cl_offSub: 'Όλα δουλεύουν και χωρίς λογαριασμό: οι ψαριές, οι φωτογραφίες και τα σημεία σας μένουν σε αυτό το τηλέφωνο.', cl_ok: 'Εντάξει',
  cl_hello: e => `Συνδεθήκατε ως ${e}`, cl_bye: 'Αποσυνδεθήκατε', cl_ended: 'Αποσυνδεθήκατε. Συνδεθείτε ξανά από το Προφίλ.',
  cl_eCred: 'Λάθος email ή κωδικός.', cl_eConfirm: 'Επιβεβαιώστε πρώτα το email σας: ανοίξτε τον σύνδεσμο που σας στείλαμε ή γράψτε τον κωδικό του.', cl_eRate: 'Πάρα πολλές προσπάθειες. Περιμένετε λίγα λεπτά και δοκιμάστε ξανά.',
  cl_eExists: 'Υπάρχει ήδη λογαριασμός με αυτό το email. Συνδεθείτε.', cl_eWeak: 'Ο κωδικός είναι πολύ αδύναμος. Χρησιμοποιήστε τουλάχιστον 8 χαρακτήρες, με γράμματα και αριθμούς.',
  cl_eExpired: 'Ο κωδικός ή ο σύνδεσμος έληξε. Ζητήστε νέο.', cl_eOffline: 'Δεν υπάρχει σύνδεση. Δοκιμάστε ξανά όταν συνδεθείτε στο ίντερνετ.', cl_eOther: 'Το email σας επιβεβαιώθηκε. Συνδεθείτε εδώ με τον κωδικό σας.',
  cl_eNoUser: 'Δεν υπάρχει ακόμη λογαριασμός με αυτό το email. Δημιουργήστε πρώτα έναν.', cl_eNoSignup: 'Οι νέοι λογαριασμοί είναι προς το παρόν κλειστοί.', cl_eEmail: 'Γράψτε ένα έγκυρο email.', cl_ePw: 'Γράψτε τον κωδικό σας.',
  cl_eAccept: 'Τσεκάρετε το κουτί για να αποδεχτείτε την πολιτική απορρήτου.', cl_eCode: 'Γράψτε τον κωδικό από το email.', cl_eWrongCode: 'Ο κωδικός δεν είναι σωστός. Ελέγξτε τον ή ζητήστε νέο.',
  cl_eFail: s => `Κάτι πήγε στραβά${s ? ` (${s})` : ''}. Δοκιμάστε ξανά.`,
  cl_acct: 'Λογαριασμός', cl_signin: 'Σύνδεση ή νέος λογαριασμός', cl_signinSub: 'Οι ψαριές και τα σημεία σας σε όλα σας τα τηλέφωνα', cl_offRow: 'Οι λογαριασμοί δεν είναι ακόμη διαθέσιμοι',
  cl_synced: r => `Συγχρονίστηκε ${r}`, cl_now: 'μόλις τώρα', cl_syncing: 'Συγχρονισμός…', cl_never: 'Δεν έχει συγχρονιστεί ακόμη', cl_offline: n => n ? `Χωρίς σύνδεση · ${n === 1 ? '1 αλλαγή' : n + ' αλλαγές'} σε αναμονή` : 'Χωρίς σύνδεση',
  cl_paused: 'Ο συγχρονισμός είναι κλειστός σε αυτό το τηλέφωνο', cl_syncNow: 'Πατήστε για συγχρονισμό τώρα', cl_addRow: 'Προσθήκη των δεδομένων του τηλεφώνου στον λογαριασμό', cl_errSync: 'Ο συγχρονισμός απέτυχε. Θα ξαναδοκιμάσει αργότερα.', cl_errAuth: 'Συνδεθείτε ξανά για συγχρονισμό',
  cl_export: 'Εξαγωγή των δεδομένων μου', cl_exportSub: 'Ένα αρχείο: ψαριές, φωτογραφίες, σημεία και προφίλ', cl_out: 'Αποσύνδεση', cl_del: 'Διαγραφή λογαριασμού και δεδομένων', cl_delSub: 'Από τον διακομιστή, οριστικά',
  cl_delT: 'Διαγραφή του λογαριασμού σας;', cl_delTxt: 'Ο λογαριασμός σας, και κάθε ψαριά, φωτογραφία, αποθηκευμένο σημείο και προφίλ σε αυτόν, διαγράφονται οριστικά από τον διακομιστή. Δεν αναιρείται.',
  cl_delLocal: 'Διαγραφή και των ψαριών και του προφίλ σε αυτό το τηλέφωνο', cl_delYes: 'Οριστική διαγραφή', cl_delDone: 'Ο λογαριασμός και τα δεδομένα του διαγράφηκαν',
  cl_cloudNote: 'Το προφίλ, οι ψαριές, οι φωτογραφίες και τα αποθηκευμένα σημεία σας φυλάσσονται στον λογαριασμό σας (σε διακομιστές στην ΕΕ) και σε αυτό το τηλέφωνο. Οι ρυθμίσεις μένουν σε αυτό το τηλέφωνο.',
});
// Psarema: the angler account (css/account.css). No server: a local profile kept on this phone (the profile in localStorage, its square
// photo as a small JPEG Blob in IndexedDB). A step-by-step "Create account" page (PsNav 'account'), Edit profile (the same parts on one page,
// with Delete account), and a one-time, dismissible offer after the first-launch tour.
// window.PsAccount = { get() → profile | null, open(step?), edit(askDelete?), remove(alsoCatches?), signin(view?) }; document fires 'ps:account' on any change.
// profile: { id, name, username, photo (getter: an object URL, or undefined), area, styles[], fish[], createdAt }
// Round 11: the profile syncs with an online account (js/cloud.js): raw() → what is synced (undefined while the photo still loads),
// photoBlob(), apply(profile | null, deleted) takes the cloud's copy. The sign-in screen (first open, and from Me) is at the end of this file.
const PsAccount = window.PsAccount = (() => {
  const KEY = 'psarema-account-v1', OFFER = 'psarema-account-offer-v1', DB = 'psarema-account', ST = 'kv', STEPS = ['welcome', 'name', 'photo', 'area', 'styles', 'fish', 'done'];
  const MODES = ['boat', 'shore', 'spear'], AREAS = () => window.PSAREMA_AREAS || [];
  const USER_RE = /^[A-Za-z0-9._]{3,20}$/;
  let prof = null, photoUrl = '', photoB = null, el = null, d = null; // d: the draft being edited; photoB: the photo's Blob (undefined while it loads)
  try { prof = JSON.parse(localStorage.getItem(KEY)) || null; } catch {}

  /* ---------- Storage ---------- */
  let dbp = null;
  const db = () => dbp ||= new Promise((ok, no) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST);
    r.onsuccess = () => ok(r.result); r.onerror = () => { dbp = null; no(r.error); };
  });
  const run = (mode, f) => db().then(x => new Promise((ok, no) => { const t = x.transaction(ST, mode), q = f(t.objectStore(ST)); t.oncomplete = () => ok(q?.result); t.onerror = t.onabort = () => no(t.error); }));
  const fire = () => document.dispatchEvent(new CustomEvent('ps:account', { detail: { profile: get() } }));
  const setUrl = blob => { if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = blob ? URL.createObjectURL(blob) : ''; photoB = blob || null; };
  if (prof?.hasPhoto) { photoB = undefined; run('readonly', s => s.get('photo')).then(b => { photoB = null; if (b && prof) { setUrl(b); fire(); } }, e => { photoB = null; console.warn('Profile photo unavailable:', e); }); }

  function get() {
    if (!prof) return null;
    const { hasPhoto, ...p } = prof;
    return Object.defineProperty({ ...p, styles: [...p.styles], fish: [...p.fish] }, 'photo', { get: () => photoUrl || undefined, enumerable: true });
  }
  async function save(p, photo) { // photo: undefined = keep, null = none, a Blob = this one
    if (photo !== undefined) {
      await run('readwrite', s => photo ? s.put(photo, 'photo') : s.delete('photo')).catch(e => console.warn('Profile photo not saved:', e));
      setUrl(photo); p.hasPhoto = !!photo;
    }
    prof = p;
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
    fire();
  }
  async function remove(alsoCatches = false) {
    prof = null; setUrl(null);
    try { localStorage.removeItem(KEY); } catch {}
    await run('readwrite', s => s.clear()).catch(() => {});
    fire();
    if (alsoCatches) { // ponytail: PsCatch has no clear(); empty its store directly and reload so it reads the empty log
      await new Promise(ok => { const r = indexedDB.open('psarema-catches'); r.onsuccess = () => { const x = r.result;
        if (!x.objectStoreNames.contains('catches')) { x.close(); return ok(); }
        const t = x.transaction('catches', 'readwrite'); t.objectStore('catches').clear(); t.oncomplete = t.onerror = () => { x.close(); ok(); }; }; r.onerror = ok; });
      location.reload();
    }
  }
  // Sync (js/cloud.js): the profile as it is synced, its photo's size as the photo's version
  const raw = () => !prof ? null : photoB === undefined ? undefined
    : { name: prof.name, username: prof.username, area: prof.area || '', styles: [...prof.styles], fish: [...prof.fish], createdAt: prof.createdAt, photo: photoB?.size || 0 };
  async function apply(p, deleted) { // the cloud's copy (checked: it is data from the network), or its deletion
    if (deleted || !p) return prof ? remove(false) : undefined;
    const name = String(p.name || '').trim().slice(0, 40), username = USER_RE.test(p.username) ? p.username : suggest(name).padEnd(3, '_');
    if (!name) return;
    await save({ id: prof?.id || (crypto.randomUUID?.() || 'u' + Date.now().toString(36)), name, username, area: AREAS().some(a => a.id === p.area) ? p.area : '',
      styles: (Array.isArray(p.styles) ? p.styles : []).filter(m => MODES.includes(m)), fish: (Array.isArray(p.fish) ? p.fish : []).filter(id => typeof id === 'string' && byId(id)).slice(0, 40),
      createdAt: Number.isFinite(p.createdAt) ? p.createdAt : Date.now(), hasPhoto: p.photo instanceof Blob }, p.photo instanceof Blob ? p.photo : null);
  }

  /* ---------- Helpers ---------- */
  const GR = { α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o' };
  const suggest = name => String(name).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ου/g, 'ou').replace(/[α-ω]/g, c => GR[c] || '')
    .trim().replace(/\s+/g, '.').replace(/[^a-z0-9._]/g, '').slice(0, 20);
  const initials = n => String(n || '').trim().split(/\s+/).slice(0, 2).map(w => [...w][0] || '').join('').toUpperCase();
  const areaName = id => { const a = AREAS().find(x => x.id === id); return a ? (state.lang === 'el' ? a.el : a.en) : ''; };
  const avatar = (url, name, cls = '') => `<span class="ui-av ac-av ${cls}">${url ? `<img src="${esc(url)}" alt="">` : initials(name) ? `<b>${esc(initials(name))}</b>` : ic('user')}</span>`;
  async function square(file) { // the middle square, 320 px, as JPEG
    const b = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file));
    try {
      const s = Math.min(b.width, b.height), c = Object.assign(document.createElement('canvas'), { width: 320, height: 320 });
      c.getContext('2d').drawImage(b, (b.width - s) / 2, (b.height - s) / 2, s, s, 0, 0, 320, 320);
      return await new Promise((ok, no) => c.toBlob(x => x ? ok(x) : no(new Error('no JPEG')), 'image/jpeg', .85));
    } finally { b.close?.(); }
  }
  const checkName = () => { const n = d.name.trim(); return n.length >= 1 && n.length <= 40; };
  const checkUser = () => USER_RE.test(d.username);

  /* ---------- Parts (one per step; Edit profile shows them all) ---------- */
  const tile = (attr, on, inner, cls = '') => `<button type="button" class="ac-tile ${cls}" ${attr} aria-pressed="${on}">${inner}<span class="ac-tick">${ic('check')}</span></button>`;
  const part = {
    name: () => `<label class="ui-field"><span>${esc(tr('ac_name'))}</span><input class="ui-input" data-ac-in="name" maxlength="40" autocomplete="name" value="${esc(d.name)}">` +
      `<small class="ac-err" data-ac-err="name"${d.err.name ? '' : ' hidden'}>${esc(tr('ac_errName'))}</small></label>` +
      `<label class="ui-field"><span>${esc(tr('ac_user'))}</span><span class="ac-at"><i>@</i><input class="ui-input" data-ac-in="username" maxlength="20" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(d.username)}"></span>` +
      `<small data-ac-err="username" class="${d.err.username ? 'ac-err' : ''}">${esc(tr(d.err.username ? 'ac_errUser' : 'ac_userHint'))}</small></label>`,
    photo: () => `<div class="ac-photo">${avatar(d.purl, d.name, 'ac-big')}<div class="ac-photo-acts">` +
      `<label class="btn lg block">${ic('camera')}${esc(tr('ac_cam'))}<input type="file" accept="image/*" capture="user" data-ac-photo hidden></label>` +
      `<label class="btn lg block">${ic('image')}${esc(tr('ac_gal'))}<input type="file" accept="image/*" data-ac-photo hidden></label>` +
      (d.purl ? `<button type="button" class="btn ghost block" data-ac="nophoto">${ic('trash')}${esc(tr('ac_rmPhoto'))}</button>` : '') + '</div></div>',
    area: () => d.mode === 'edit' // one compact field on the edit page; a list to tap through in the flow
      ? `<select class="ui-input" data-ac-in="area" aria-label="${esc(tr('ac_area'))}"><option value="">–</option>${AREAS().map(a => `<option value="${esc(a.id)}"${d.area === a.id ? ' selected' : ''}>${esc(state.lang === 'el' ? a.el : a.en)}</option>`).join('')}</select>`
      : `<div class="ui-list ac-areas" role="radiogroup">${AREAS().map(a => `<button type="button" class="ui-row ac-area" role="radio" data-ac-area="${esc(a.id)}" aria-checked="${d.area === a.id}">` +
      `${ic('pin')}<span class="ui-row-main"><b>${esc(state.lang === 'el' ? a.el : a.en)}</b></span><span class="ac-radio">${ic('check')}</span></button>`).join('')}</div>`,
    styles: () => `<div class="ac-styles">${MODES.map(m => tile(`data-ac-style="${m}"`, d.styles.includes(m), `${ic(m)}<b>${esc(tr(m))}</b>`, 'ac-style')).join('')}</div>`,
    fish: () => `<div class="ac-fish">${SPECIES.map(s => tile(`data-ac-fish="${esc(s.id)}"`, d.fish.includes(s.id),
      `<span class="ac-cut">${PsPanel.fish(s) || ic('fish')}</span><b>${esc(fishName(s))}</b>`, 'ac-fishtile')).join('')}</div>`,
  };
  const Q = { name: ['ac_nameQ', 'ac_nameSub'], photo: ['ac_photoQ', 'ac_photoSub'], area: ['ac_areaQ', 'ac_areaSub'], styles: ['ac_styleQ', 'ac_styleSub'], fish: ['ac_fishQ', 'ac_fishSub'] };
  const LBL = { name: 'ac_prof', photo: 'ac_photo', area: 'ac_area', styles: 'ac_style', fish: 'ac_fish' };

  function draw() {
    if (!el || !d) return;
    if (d.mode === 'edit') return drawEdit();
    const st = STEPS[d.step], k = d.step, n = STEPS.length - 2; // steps 1..5 count
    let main, foot;
    if (st === 'welcome') {
      main = `<div class="ac-hero"><span class="ac-badge">${ic('user')}<i>${ic('fish')}</i></span><h2>${esc(tr('ac_hello'))}</h2><p>${esc(tr('ac_helloSub'))}</p></div>` +
        `<ul class="ac-bul">${['ac_b1', 'ac_b2', 'ac_b3'].map((b, i) => `<li>${ic(['user', 'trophy', 'fish'][i])}<span>${esc(tr(b))}</span></li>`).join('')}</ul>` +
        `<div class="ac-note">${ic('shield')}<p>${window.PsCloud?.user() ? `<b>${esc(tr('ac_inAcct'))}</b>` : `<b>${esc(tr('ac_local'))}</b>${window.PsCloud?.on ? ' ' + esc(tr('ac_cloud')) : ''}`}</p></div>`;
      foot = `<button type="button" class="btn lg block primary" data-ac="next">${esc(tr('ac_start'))}</button><button type="button" class="btn ghost block" data-ac="close">${esc(tr('ac_later'))}</button>`;
    } else if (st === 'done') {
      main = `<div class="ac-hero ac-done">${avatar(photoUrl, prof?.name, 'ac-big')}<h2>${esc(tr('ac_doneT', prof?.name || ''))}</h2>` +
        `<p class="ac-handle">@${esc(prof?.username || '')}${prof?.area ? ` · ${esc(areaName(prof.area))}` : ''}</p><p>${esc(tr('ac_doneSub'))}</p></div>`;
      foot = `<button type="button" class="btn lg block primary" data-ac="profile">${esc(tr('ac_toProfile'))}</button><button type="button" class="btn lg block" data-ac="log">${ic('plus')}${esc(tr('ac_logCatch'))}</button>`;
    } else {
      main = `<div class="ac-prog" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i${i < k ? ' class="on"' : ''}></i>`).join('')}</div>` +
        `<p class="lbl ac-of">${esc(tr('ac_stepOf', k, n))}</p><h2 class="ac-q">${esc(tr(Q[st][0]))}</h2><p class="ac-sub">${esc(tr(Q[st][1]))}</p><div class="ac-part">${part[st]()}</div>`;
      foot = `<div class="ac-row"><button type="button" class="btn lg" data-ac="prev">${ic('chevron-left')}${esc(tr('ac_back'))}</button>` +
        (st !== 'name' ? `<button type="button" class="btn lg ghost" data-ac="skip">${esc(tr('ac_skip'))}</button>` : '') +
        `<button type="button" class="btn lg primary ac-go" data-ac="next">${esc(tr('ac_next'))}${ic('chevron-right')}</button></div>`;
    }
    el.innerHTML = `<div class="ac-main" data-ac-step="${st}">${main}</div><div class="ac-foot">${foot}</div>`;
    el.scrollTop = 0;
  }
  function drawEdit() {
    const y = el.scrollTop;
    el.innerHTML = `<div class="ac-main ac-edit">${['photo', 'name', 'area', 'styles', 'fish'].map(k => `<div class="ui-sec"><h3>${esc(tr(LBL[k]))}</h3></div><div class="ac-part">${part[k]()}</div>`).join('')}` +
      `<div class="ui-sec"><h3>${esc(tr('ac_del'))}</h3></div>` + (d.confirm
        ? `<div class="ui-card ac-confirm" role="alertdialog" aria-labelledby="ac-del-q"><b id="ac-del-q">${esc(tr('ac_delQ'))}</b><p>${esc(tr('ac_delTxt'))}</p>` +
          `<label class="ac-check"><input type="checkbox" data-ac-in="alsoCatches"${d.alsoCatches ? ' checked' : ''}><span>${esc(tr('ac_delCatches'))}</span></label>` +
          `<div class="ac-row"><button type="button" class="btn lg" data-ac="nodel">${esc(tr('ac_cancel'))}</button><button type="button" class="btn lg danger" data-ac="del">${ic('trash')}${esc(tr('ac_delYes'))}</button></div></div>`
        : `<div class="ui-list"><button type="button" class="ui-row ac-delrow" data-ac="askdel">${ic('trash')}<span class="ui-row-main"><b>${esc(tr('ac_del'))}</b><small>${esc(tr('ac_delSub'))}</small></span></button></div>`) +
      `</div><div class="ac-foot"><div class="ac-row"><button type="button" class="btn lg" data-ac="close">${esc(tr('ac_cancel'))}</button><button type="button" class="btn lg primary ac-go" data-ac="save">${ic('check')}${esc(tr('ac_save'))}</button></div></div>`;
    el.scrollTop = y;
  }

  /* ---------- Flow ---------- */
  function fresh(mode, step = 0) {
    const p = prof || {};
    if (d?.purl && d.photo) URL.revokeObjectURL(d.purl);
    d = { mode, step, name: p.name || '', username: p.username || '', area: p.area || '', styles: [...(p.styles || (state.mode ? [state.mode] : []))], fish: [...(p.fish || [])],
      photo: undefined, purl: photoUrl, uTouched: !!p.username, err: {}, confirm: false, alsoCatches: false };
  }
  function open(step) {
    const i = typeof step === 'number' ? step : Math.max(0, STEPS.indexOf(step));
    fresh('create', i); PsNav.open('account', 'create');
  }
  function edit(askDelete) {
    if (!prof) return open();
    fresh('edit'); d.confirm = !!askDelete; PsNav.open('account', 'edit');
    if (askDelete) requestAnimationFrame(() => el?.querySelector('.ac-confirm')?.scrollIntoView({ block: 'center' }));
  }
  const valid = () => { d.err = { name: !checkName(), username: !checkUser() }; return !d.err.name && !d.err.username; };
  const profileOf = () => ({ id: prof?.id || (crypto.randomUUID?.() || 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)),
    name: d.name.trim(), username: d.username, area: d.area, styles: d.styles, fish: d.fish, createdAt: prof?.createdAt || Date.now(), hasPhoto: prof?.hasPhoto || false });
  async function next(skip) {
    const st = STEPS[d.step];
    if (st === 'name' && !valid()) { draw(); el.querySelector(d.err.name ? '[data-ac-in=name]' : '[data-ac-in=username]')?.focus(); return; }
    if (skip && st === 'photo' && d.photo) { d.photo = null; d.purl = ''; }
    if (skip && st === 'area') d.area = '';
    if (skip && st === 'styles') d.styles = [];
    if (skip && st === 'fish') d.fish = [];
    if (st === 'fish') await save(profileOf(), d.photo); // the last question: the account exists from here
    d.step++; draw();
  }
  async function click(e) {
    const t = e.target.closest('[data-ac], [data-ac-area], [data-ac-style], [data-ac-fish]'); if (!t || !d) return;
    const a = t.dataset;
    if (a.acArea != null) { d.area = d.area === a.acArea ? '' : a.acArea; for (const b of el.querySelectorAll('[data-ac-area]')) b.setAttribute('aria-checked', b.dataset.acArea === d.area); return; }
    const flip = (list, v) => { const i = list.indexOf(v); i < 0 ? list.push(v) : list.splice(i, 1); t.setAttribute('aria-pressed', i < 0); };
    if (a.acStyle) return flip(d.styles, a.acStyle);
    if (a.acFish) return flip(d.fish, a.acFish);
    switch (a.ac) {
      case 'next': return next(false);
      case 'skip': return next(true);
      case 'prev': d.step = Math.max(0, d.step - 1); return draw();
      case 'close': return PsNav.back();
      case 'profile': return PsNav.open('me');
      case 'log': PsNav.open('me'); return window.PsCatch?.log?.(-1);
      case 'nophoto': if (d.photo) URL.revokeObjectURL(d.purl); d.photo = null; d.purl = ''; return draw();
      case 'askdel': d.confirm = true; draw(); return el.querySelector('.ac-confirm')?.scrollIntoView({ block: 'center' });
      case 'nodel': d.confirm = false; return draw();
      case 'del': { const also = d.alsoCatches; d = null; PsNav.open('me'); toast(tr('ac_deleted')); return remove(also); }
      case 'save': if (!valid()) { drawEdit(); return el.querySelector('.ac-err:not([hidden])')?.closest('.ui-field')?.scrollIntoView({ block: 'center' }); }
        await save(profileOf(), d.photo); toast(tr('ac_saved')); return PsNav.back();
    }
  }
  function input(e) {
    const t = e.target, k = t.dataset.acIn; if (!k || !d) return;
    if (k === 'alsoCatches') { d.alsoCatches = t.checked; return; }
    d[k] = t.value;
    if (k === 'username') { d.uTouched = !!t.value; d.err.username = false; }
    if (k === 'name') {
      d.err.name = false;
      if (!d.uTouched) { d.username = suggest(t.value); const u = el.querySelector('[data-ac-in=username]'); if (u) u.value = d.username; }
    }
    const er = el.querySelector(`[data-ac-err="${k}"]`); // the hint comes back once it is being fixed
    if (er) { if (k === 'name') er.hidden = true; else { er.className = ''; er.textContent = tr('ac_userHint'); } }
  }
  async function change(e) {
    const t = e.target; if (!t.matches('[data-ac-photo]') || !t.files?.[0] || !d) return;
    try {
      const b = await square(t.files[0]);
      if (d.photo) URL.revokeObjectURL(d.purl);
      d.photo = b; d.purl = URL.createObjectURL(b); draw();
    } catch (err) { console.warn(err); toast(tr('ac_photoErr')); }
    t.value = '';
  }
  PsNav.add('account', { title: a => tr(a === 'edit' ? 'ac_edit' : 'ac_title'), icon: 'user', big: false,
    show(body, arg) {
      if (!el) { el = body; el.classList.add('ac-body'); el.addEventListener('click', click); el.addEventListener('input', input); el.addEventListener('change', change); }
      if (!d || d.mode !== (arg === 'edit' ? 'edit' : 'create')) fresh(arg === 'edit' && prof ? 'edit' : 'create');
      draw();
    },
    hide() { if (d?.mode === 'create' && STEPS[d.step] === 'done') d = null; } });

  /* ---------- The one-time offer (round 14: on a later start, below; it was right after the first-launch tour) ---------- */
  function offer() {
    if (prof || localStorage.getItem(OFFER) || window.PsCloud?.on) return; // with online accounts, the first-open sign-in screen came instead
    try { localStorage.setItem(OFFER, '1'); } catch {}
    const o = Object.assign(document.createElement('div'), { className: 'ac-offer', role: 'dialog' });
    o.setAttribute('aria-labelledby', 'ac-offer-t');
    o.innerHTML = `<span class="ui-av">${ic('user')}</span><div class="ac-offer-txt"><b id="ac-offer-t">${esc(tr('ac_offerT'))}</b><small>${esc(tr('ac_offerSub'))}</small></div>` +
      `<button type="button" class="btn primary" data-o="go">${esc(tr('ac_create'))}</button><button type="button" class="icon-btn" data-o="x" aria-label="${esc(tr('ac_later'))}">${ic('close')}</button>`;
    const away = e => { if (!o.contains(e.target)) bye(); }; // round 14: a touch anywhere else puts it away too
    const bye = () => { o.classList.add('out'); setTimeout(() => o.remove(), 200); document.removeEventListener('ps:page', bye); document.removeEventListener('pointerdown', away, true); };
    o.addEventListener('click', e => { const b = e.target.closest('[data-o]'); if (!b) return; bye(); if (b.dataset.o === 'go') open(); });
    document.addEventListener('ps:page', bye); // any move elsewhere puts it away: it never blocks the app
    document.addEventListener('pointerdown', away, true);
    setTimeout(bye, 15000);
    document.body.append(o);
  }
  // Round 14: on a later start, not the first (that one is the welcome, then the map alone), 9 s in; only over the bare map (phones: the
  // sheet down, no spot open), else on a later start
  try {
    if (!prof && localStorage.getItem(GUIDE_SEEN) && !localStorage.getItem(OFFER))
      setTimeout(() => { if (window.PsNav?.current?.() === 'map' && !document.querySelector('.modal:not([hidden]), #m-sheet[data-spot]') && !(isPhone() && !$('#m-sheet').classList.contains('peek'))) offer(); }, 9000);
  } catch {}

  return { get, open, edit, remove, raw, photoBlob: () => photoB || null, apply };
})();

// Psarema: the sign-in screen (round 11; js/cloud.js does the talking, css/account.css). Shown once on the first open while signed out
// (and again after signing out), over everything: Sign in · Create account · a sign-in link or code by email · Google (when the owner set
// it up), and "Continue as guest" at its foot: the app as before, nothing lost. From Me it opens the same way, its foot "Not now".
// Views: 'in' | 'up' | 'check' (a link and code were emailed) | 'ask' (add this phone's data to the account?) | 'off' (no accounts yet) | 'del'.
// Tests skip the first-open screen with localStorage 'psarema-welcome-v1' = '1' (any value), as 'psarema-guide-v1' skips the tour.
// Without accounts configured (js/auth-config.js empty) it never opens by itself.
// Icons the shared set lacks (as js/catchlog.js adds its own): mail, sign out, download
if (!document.getElementById('i-mail')) document.body.insertAdjacentHTML('beforeend', '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' +
  [['mail', '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6.5L20.5 7"/>'], ['logout', '<path d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14"/><path d="M10.5 12H21m-3.5-3.5L21 12l-3.5 3.5"/>'],
    ['download', '<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>']]
    .map(([k, d]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${d}</symbol>`).join('') + '</svg>');
PsAccount.signin = (() => {
  const C = window.PsCloud, SEEN = 'psarema-welcome-v1', EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  let el = null, v = 'in', first = false, f = { email: '', pw: '', accept: false, code: '', show: false, why: 'link', alsoLocal: false }, msg = null, busy = false, guard = false, eat = false;
  const pwOk = p => p.length >= 8 && p.length <= 72 && /\p{L}/u.test(p) && /\d/.test(p);
  const ERR = { invalid_credentials: 'cl_eCred', email_not_confirmed: 'cl_eConfirm', over_request_rate_limit: 'cl_eRate', over_email_send_rate_limit: 'cl_eRate', over_sms_send_rate_limit: 'cl_eRate',
    user_already_exists: 'cl_eExists', email_exists: 'cl_eExists', weak_password: 'cl_eWeak', otp_expired: 'cl_eExpired', offline: 'cl_eOffline', network: 'cl_eOffline', other_device: 'cl_eOther',
    otp_disabled: 'cl_eNoUser', user_not_found: 'cl_eNoUser', signup_disabled: 'cl_eNoSignup', email_provider_disabled: 'cl_eNoSignup', email_address_invalid: 'cl_eEmail', validation_failed: 'cl_eEmail' };
  const why = e => { // a GoTrue error → the words for it; older servers say it only in the message
    const m = String(e?.message || ''), tok = e?.code === 'otp_expired' || /expired|invalid.*(otp|token)|token.*invalid/i.test(m);
    const k = v === 'check' && tok ? 'cl_eWrongCode' : ERR[e?.code] || (e?.status === 429 ? 'cl_eRate' : /invalid login/i.test(m) ? 'cl_eCred' : /not confirmed/i.test(m) ? 'cl_eConfirm'
      : tok ? 'cl_eExpired' : /signups? not allowed/i.test(m) ? 'cl_eNoUser' : '');
    return k ? { k, info: k === 'cl_eOther' } : { k: 'cl_eFail', a: e?.status || e?.code || '' };
  };
  const say = (k, ...a) => esc(tr(k, ...a));
  const G = '<svg class="au-g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  function field(k, label, type, extra = '') {
    return `<label class="ui-field"><span>${say(label)}</span><span class="au-in"><input class="ui-input" data-au="${k}" type="${type}" value="${esc(f[k])}" ${extra}>` +
      (k === 'pw' ? `<button type="button" class="icon-btn au-eye" data-au-act="eye" aria-pressed="${f.show}" aria-label="${say('cl_pwShow')}">${ic('eye')}</button>` : '') + '</span></label>';
  }
  const note = () => msg ? `<p class="au-msg${msg.info ? ' info' : ''}" role="alert">${say(msg.k, msg.a)}</p>` : '';
  const go = (label, cls = 'primary') => `<button type="submit" class="btn lg block ${cls}"${busy ? ' disabled aria-busy="true"' : ''}>${busy ? '<span class="au-spin" aria-hidden="true"></span>' : ''}${say(label)}</button>`;
  function body() {
    if (v === 'off') return `<div class="au-hero">${ic('shield')}<h2 id="au-t">${say('cl_offT')}</h2><p>${say('cl_offSub')}</p></div>`;
    if (v === 'ask') { const n = C.status().local || { catches: 0, places: 0 };
      return `<div class="au-hero">${ic('refresh')}<h2 id="au-t">${say('cl_askT')}</h2><p>${say('cl_askSub', [n.catches && tr('cl_nCatch', n.catches), n.places && tr('cl_nPlace', n.places)].filter(Boolean).join(', '))}</p></div>` +
        `<div class="au-acts"><button type="button" class="btn lg block primary" data-au-act="yes">${say('cl_askYes')}</button><button type="button" class="btn lg block" data-au-act="no">${say('cl_askNo')}</button></div>`; }
    if (v === 'del') return `<div class="au-hero">${ic('trash')}<h2 id="au-t">${say('cl_delT')}</h2><p>${say('cl_delTxt')}</p></div>` +
      `<label class="ac-check"><input type="checkbox" data-au="alsoLocal"${f.alsoLocal ? ' checked' : ''}><span>${say('cl_delLocal')}</span></label>${note()}` +
      `<form class="au-form" data-au-form="del">${go('cl_delYes', 'danger')}</form>`;
    if (v === 'check') return `<div class="au-hero">${ic('mail')}<h2 id="au-t">${say('cl_checkT')}</h2><p>${say('cl_checkSub', f.email)}</p></div>` +
      `<form class="au-form" data-au-form="code" novalidate>${field('code', 'cl_code', 'text', 'inputmode="numeric" autocomplete="one-time-code" maxlength="10" pattern="[0-9]*"')}${note()}${go('cl_confirm')}</form>` +
      `<div class="au-links"><button type="button" class="btn ghost" data-au-act="resend">${say('cl_resend')}</button><button type="button" class="btn ghost" data-au-act="other">${say('cl_other')}</button></div>`;
    const up = v === 'up';
    return `<div class="au-brand"><span class="au-logo">${ic('fish')}</span><div><h2 id="au-t">Psarema</h2><p>${say('cl_tag')}</p></div></div>` +
      `<div class="ui-seg block au-seg" role="tablist">${[['in', 'cl_in'], ['up', 'cl_up']].map(([k, l]) => `<button type="button" role="tab" data-au-act="${k}" aria-selected="${v === k}" aria-pressed="${v === k}">${say(l)}</button>`).join('')}</div>` +
      `<form class="au-form" data-au-form="${v}" novalidate>${field('email', 'cl_email', 'email', 'autocomplete="email" autocapitalize="none" spellcheck="false" inputmode="email"')}` +
      field('pw', 'cl_pw', f.show ? 'text' : 'password', `autocomplete="${up ? 'new-password' : 'current-password'}" maxlength="72"`) +
      (up ? `<small class="au-rule${msg?.k === 'cl_eWeak' ? ' bad' : ''}">${say('cl_pwRule')}</small><label class="ac-check au-accept"><input type="checkbox" data-au="accept"${f.accept ? ' checked' : ''}><span>${say('cl_accept')} <a href="privacy.html" target="_blank" rel="noopener">${say('cl_privacy')}</a></span></label>` : '') +
      note() + go(up ? 'cl_doUp' : 'cl_doIn') + '</form>' +
      (up ? '' : `<button type="button" class="btn ghost block au-linkbtn" data-au-act="link"${busy ? ' disabled' : ''}>${ic('mail')}${say('cl_link')}</button>`) +
      (C.google ? `<div class="au-or"><span>${say('cl_or')}</span></div><button type="button" class="btn lg block au-google" data-au-act="google"${busy ? ' disabled' : ''}>${G}${say('cl_google')}</button>` : '');
  }
  function draw(focus) {
    if (!el) return;
    const a = document.activeElement?.dataset?.au, y = el.querySelector('.au-main')?.scrollTop || 0;
    el.innerHTML = `<div class="au-card"><div class="au-main">${body()}</div>` + (v === 'ask' ? '' : `<div class="au-foot"><button type="button" class="btn ${v === 'off' ? 'lg' : 'ghost'} block au-guest" data-au-act="close">${say(v === 'off' ? 'cl_ok' : first ? 'cl_guest' : 'cl_close')}</button></div>`) + '</div>';
    el.querySelector('.au-main').scrollTop = focus ? 0 : y;
    const t = focus ? el.querySelector(focus) : a && el.querySelector(`[data-au="${a}"]`);
    if (t) { t.focus({ preventScroll: true }); if (t.setSelectionRange && t.type !== 'email') try { t.setSelectionRange(t.value.length, t.value.length); } catch {} }
  }
  function open(view, isFirst = false) {
    first = isFirst; v = !C.on ? 'off' : view || (C.status().ask ? 'ask' : 'in'); msg = null; busy = false;
    if (!el) {
      el = Object.assign(document.createElement('div'), { id: 'auth', className: 'au', tabIndex: -1 });
      el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'au-t');
      el.addEventListener('click', click); el.addEventListener('input', input); el.addEventListener('change', input); el.addEventListener('submit', submit);
      document.body.append(el);
    }
    el.hidden = false; document.documentElement.classList.add('au-on'); draw(); el.focus({ preventScroll: true });
    if (!guard) { history.pushState({ psAuth: 1 }, ''); guard = true; } // the system Back closes it (below), as the foot's button
  }
  function close(fromBack) {
    if (!el || el.hidden) return;
    if (first) try { localStorage.setItem(SEEN, C.user() ? 'in' : 'guest'); } catch {}
    el.hidden = true; document.documentElement.classList.remove('au-on'); first = false;
    if (guard && !fromBack) { guard = false; eat = true; history.back(); } else guard = false;
  }
  // The system Back: this screen closes, nothing under it. Window listeners run in the order they were added, so js/cloud.js (loaded
  // before js/mobile.js) adds the listener that calls this.
  window.PsAuthBack = e => {
    if (eat) { eat = false; e.stopImmediatePropagation(); return; }
    if (guard && !history.state?.psAuth) { guard = false; e.stopImmediatePropagation(); if (v === 'ask') C.answer(false); close(true); }
  };
  addEventListener('keydown', e => { if (e.key === 'Escape' && el && !el.hidden) { e.stopImmediatePropagation(); if (v === 'ask') C.answer(false); close(); } }, true);
  const done = r => { // signed in: the question about this phone's data, else closed
    toast(tr('cl_hello', C.user()?.email || ''));
    if (r === 'in' && C.status().ask) { v = 'ask'; msg = null; draw(); } else close();
  };
  async function act(fn) {
    if (busy) return; busy = true; msg = null; draw();
    try { return await fn(); } catch (e) { msg = why(e); return null; } finally { busy = false; if (el && !el.hidden) draw(); }
  }
  async function submit(e) {
    e.preventDefault(); const k = e.target.dataset.auForm; f.email = f.email.trim();
    const stop = (m, sel) => { msg = { k: m }; draw(sel); };
    if (k === 'in' || k === 'up') {
      if (!EMAIL_RE.test(f.email)) return stop('cl_eEmail', '[data-au="email"]');
      if (!f.pw) return stop('cl_ePw', '[data-au="pw"]');
      if (k === 'up' && !pwOk(f.pw)) return stop('cl_eWeak', '[data-au="pw"]');
      if (k === 'up' && !f.accept) return stop('cl_eAccept');
      const r = await act(() => k === 'in' ? C.signIn(f.email, f.pw) : C.signUp(f.email, f.pw));
      if (r === 'confirm') { v = 'check'; f.why = 'signup'; f.code = ''; draw('[data-au="code"]'); }
      else if (r) { f.pw = ''; done(r); }
    } else if (k === 'code') {
      f.code = f.code.replace(/\D/g, '');
      if (f.code.length < 6) return stop('cl_eCode', '[data-au="code"]');
      const r = await act(() => C.verify(f.email, f.code)); if (r) { f.pw = ''; done(r); }
    } else if (k === 'del') {
      const r = await act(async () => { await C.deleteAccount(); return 1; });
      if (r) { const also = f.alsoLocal; close(); toast(tr('cl_delDone')); if (also) PsAccount.remove(true); }
    }
  }
  function click(e) {
    const t = e.target.closest('[data-au-act]'); if (!t) return;
    const a = t.dataset.auAct;
    if (a === 'in' || a === 'up') { if (v !== a) { v = a; msg = null; draw(); } }
    else if (a === 'eye') { f.show = !f.show; draw('[data-au="pw"]'); }
    else if (a === 'close') close();
    else if (a === 'yes' || a === 'no') { C.answer(a === 'yes'); close(); }
    else if (a === 'other') { v = 'in'; msg = null; draw('[data-au="email"]'); }
    else if (a === 'google') act(() => C.oauth());
    else if (a === 'link' || a === 'resend') {
      f.email = f.email.trim();
      if (!EMAIL_RE.test(f.email)) { v = 'in'; msg = { k: 'cl_eEmail' }; return draw('[data-au="email"]'); }
      const signup = a === 'resend' && f.why === 'signup';
      act(async () => { await (signup ? C.signUp(f.email, f.pw) : C.sendLink(f.email)); return 1; }).then(r => {
        if (!r) return;
        if (a === 'resend') toast(tr('cl_sent')); else { f.why = 'link'; f.code = ''; v = 'check'; draw('[data-au="code"]'); }
      });
    }
  }
  function input(e) { const k = e.target.dataset.au; if (!k) return; f[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; }
  new MutationObserver(() => { if (el && !el.hidden) draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); // ui.js applyLang

  // Opened after start-up (the app's own history entries first, so Back reaches this screen first): data/boot.js sends 'load' once every app
  // script is in. Back from an email link or Google (js/cloud.js; it may have come back before this file loaded): signed in, or why not.
  let up = false, last = null;
  addEventListener('load', () => { up = true; }, { once: true });
  const later = fn => up ? fn() : addEventListener('load', () => setTimeout(fn, 50), { once: true });
  const back = x => { // x: { r: 'in' | an error } from js/cloud.js, each return once
    if (!x || x.r === 'pending' || x === last) return; last = x; const r = x.r;
    if (r === 'in') { if (!el || el.hidden) open('in', !localStorage.getItem(SEEN)); done(r); }
    else { open('in', !localStorage.getItem(SEEN)); msg = why(r); draw(); }
  };
  document.addEventListener('ps:cloud-back', e => later(() => back(e.detail)));
  later(() => back(C.returned()));
  // The first open: no session, accounts set up, not seen yet (tests: 'psarema-welcome-v1'), not coming back from a link
  if (C.on && !C.user() && !localStorage.getItem(SEEN) && C.returned() == null)
    later(() => { if (!C.user() && !localStorage.getItem(SEEN) && C.returned() == null) open('in', true); });
  return (view, isFirst) => open(view, isFirst);
})();
