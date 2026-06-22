import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import api from "./api";

const firebaseConfig = {
  apiKey: "AIzaSyDtFw9txAiSlxqTKRXTCAWazRbKWzva_Uc",
  authDomain: "pavitra-96343.firebaseapp.com",
  projectId: "pavitra-96343",
  storageBucket: "pavitra-96343.firebasestorage.app",
  messagingSenderId: "497531317999",
  appId: "1:497531317999:web:bf55da31fcff09eeaff51a",
  measurementId: "G-1HN5Q8LWHQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Helper to request permission and register token
export const requestNotificationPermission = async (studentId: string, email: string) => {
  try {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications.');
      return null;
    }

    const supported = await isSupported();
    if (!supported) {
      console.warn('Firebase Cloud Messaging is not supported in this browser.');
      return null;
    }

    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      const token = await getToken(messaging, {
        vapidKey: 'BJlUAVNVfJS_1tOzQki1Kbx4tv4H6gesS07IZKxxO2OqlcfOqFFYR9_zelC4xR9Y-HJyxRCqsKcAJ7vWi4L35-s'
      });
      
      if (token) {
        console.log('FCM Registration Token generated.');
        // Save the FCM token to the database via API
        await api.post('/api/update_fcm_token.php', {
          student_id: studentId,
          email: email,
          fcm_token: token
        });
        return token;
      } else {
        console.warn('No FCM token generated.');
      }
    } else {
      console.warn('Notification permission was not granted.');
    }
  } catch (error) {
    console.error('Error setting up push notifications:', error);
  }
  return null;
};

// Listen for foreground notifications
export const listenForMessages = async (onMessageReceived: (payload: any) => void) => {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      console.log('Foreground message received: ', payload);
      onMessageReceived(payload);
    });
  } catch (error) {
    console.error('Error starting foreground message listener:', error);
    return null;
  }
};
