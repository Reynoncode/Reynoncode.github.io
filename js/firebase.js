/* ═══════════════════════════════════════════
   firebase.js — Firebase konfiqurasiyası
   Firebase Console > Layihə Parametrləri > Web App-dan
   aldığın məlumatları bura yaz
   ═══════════════════════════════════════════ */

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);

const fbAuth = firebase.auth();
const fbDb   = firebase.firestore();
