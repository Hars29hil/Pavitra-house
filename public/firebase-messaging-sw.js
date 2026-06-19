// Import and configure the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDtFw9txAiSlxqTKRXTCAWazRbKWzva_Uc",
  authDomain: "pavitra-96343.firebaseapp.com",
  projectId: "pavitra-96343",
  storageBucket: "pavitra-96343.firebasestorage.app",
  messagingSenderId: "497531317999",
  appId: "1:497531317999:web:bf55da31fcff09eeaff51a",
  measurementId: "G-1HN5Q8LWHQ"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || "Notification from Pavitra House";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: '/header-logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
