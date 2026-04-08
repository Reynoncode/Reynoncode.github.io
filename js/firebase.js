const firebaseConfig = {
  apiKey: "AIzaSyBOIIMEZIkSucTpuQDNlC2mPLtTs-JOWR0",
  authDomain: "almoda-62b1e.firebaseapp.com",
  projectId: "almoda-62b1e",
  storageBucket: "almoda-62b1e.firebasestorage.app",
  messagingSenderId: "762594017109",
  appId: "1:762594017109:web:bf7a2d0e5188895b6d79dc"
};

firebase.initializeApp(firebaseConfig);

const fbAuth = firebase.auth();
const fbDb   = firebase.firestore();
