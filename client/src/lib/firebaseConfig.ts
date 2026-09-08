// ============================================================
// APYMSA — Configuración de Firebase (estado compartido por internet)
// ------------------------------------------------------------
// Pega aquí la configuración de TU proyecto Firebase para que el estado se
// comparta entre computadoras usando el MISMO link de GitHub Pages.
//
// Cómo obtenerla (una sola vez):
//   1. https://console.firebase.google.com  → "Agregar proyecto" (nombre libre).
//   2. Menú "Compilación" → "Realtime Database" → "Crear base de datos"
//      (ubicación por defecto, y en reglas elige "modo de prueba").
//   3. Rueda de ajustes ⚙ → "Configuración del proyecto" → sección "Tus apps"
//      → ícono web </> → registra una app → copia el objeto firebaseConfig.
//   4. Pega esos valores abajo (incluida databaseURL) y guarda.
//
// Mientras 'databaseURL' esté vacío, la app usa el modo LOCAL (mismo servidor),
// que sirve para desarrollo y para computadoras en la misma red.
// La apiKey web NO es secreta (Firebase la expone a propósito); la seguridad se
// controla con las reglas de la Realtime Database.
// ============================================================
export const firebaseConfig = {
  apiKey: 'AIzaSyBGxQF8eWvIX-aIgFNsEBA5bZL63Yeab-s',
  authDomain: 'nexus-c68ec.firebaseapp.com',
  databaseURL: 'https://nexus-c68ec-default-rtdb.firebaseio.com',
  projectId: 'nexus-c68ec',
  storageBucket: 'nexus-c68ec.firebasestorage.app',
  messagingSenderId: '279397122399',
  appId: '1:279397122399:web:d15b299c37dcde5ccfb6ea',
  measurementId: 'G-JKMEMZS0JF',
};

// Firebase se activa solo si hay databaseURL + apiKey. Si no, se usa el modo local.
export const firebaseEnabled = Boolean(firebaseConfig.databaseURL && firebaseConfig.apiKey);

// Nodo de la Realtime Database donde vive el estado compartido del ejercicio.
export const FIREBASE_STATE_PATH = 'exodus_sucursales/estado';
