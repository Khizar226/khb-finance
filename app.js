import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, browserLocalPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const requiredKeys = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId"
];

const missing = requiredKeys.filter((key) => !firebaseConfig[key] || String(firebaseConfig[key]).startsWith("REPLACE_"));
if (missing.length > 0) {
    console.error("Firebase config is incomplete. Missing:", missing.join(", "));
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Auth persistence setup failed:", error);
});
