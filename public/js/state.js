// ============================================================
// MotoTrack — Global application state
// Loaded first; every other module reads/writes these bindings.
// ============================================================

// Session
let currentUser = null;
let currentRole = null;
let authToken = localStorage.getItem('mt_token') || null;

// Kanban workflow stages, in order
const STAGES = ['Intake', 'Disassembly', 'Tuning', 'QA', 'Release'];

// Mechanics available for assignment
const MECHANICS = ['John Hendrix', 'Vince Sael', 'Dhax Allen', 'Jan Cairo'];

// The most common motorcycle brands in the Philippines. Drives both the
// intake form's brand dropdown and the admin brand chart's grouping —
// anything not in this list falls under "Others".
const MOTO_BRANDS = ['Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Rusi'];

// Data caches, refreshed from the API before each view render
let dbUsers = [];
let dbJobs = [];
let dbInv = [];
let dbExpenses = [];
