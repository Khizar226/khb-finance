import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCTYjFz7UugblWgJfSyXQBL85YW0NHES0s",
    authDomain: "khb-finance.firebaseapp.com",
    projectId: "khb-finance",
    storageBucket: "khb-finance.firebasestorage.app",
    messagingSenderId: "588458202276",
    appId: "1:588458202276:web:1773d693bae5300bc70231",
    measurementId: "G-CG4KL9B0TN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export Auth and Database
export const auth = getAuth(app);
export const db = getFirestore(app);