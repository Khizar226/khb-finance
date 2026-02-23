import { auth } from './app.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const authForm = document.getElementById('authForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authTitle = document.getElementById('authTitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const toggleAuthText = document.getElementById('toggleAuthText');
const googleLoginBtn = document.getElementById('googleLoginBtn');

const urlParams = new URLSearchParams(window.location.search);
let isLoginMode = urlParams.get('mode') !== 'signup';

function updateUI() {
    if (isLoginMode) {
        authTitle.innerText = "Secure Login";
        authSubmitBtn.innerText = "Log In";
        toggleAuthText.innerHTML = `Don't have an account? <a href="#" id="toggleAuthMode" class="text-blue-600 hover:underline">Sign up</a>`;
    } else {
        authTitle.innerText = "Create Master Account";
        authSubmitBtn.innerText = "Sign Up";
        toggleAuthText.innerHTML = `Already have an account? <a href="#" id="toggleAuthMode" class="text-blue-600 hover:underline">Log in</a>`;
    }
    
    document.getElementById('toggleAuthMode').addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateUI();
    });
}

updateUI();

// Email & Password Auth
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        if (isLoginMode) {
            authSubmitBtn.innerText = "Authenticating...";
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "dashboard.html"; 
        } else {
            authSubmitBtn.innerText = "Creating secure account...";
            await createUserWithEmailAndPassword(auth, email, password);
            window.location.href = "dashboard.html";
        }
    } catch (error) {
        console.error("Auth Error:", error);
        alert(`Error: ${error.message}`);
        updateUI(); 
    }
});

// Google Login
const provider = new GoogleAuthProvider();
googleLoginBtn.addEventListener('click', async () => {
    try {
        googleLoginBtn.innerHTML = "Authenticating...";
        await signInWithPopup(auth, provider);
        window.location.href = "dashboard.html";
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        alert(`Error: ${error.message}`);
        googleLoginBtn.innerHTML = "Sign in with Google";
    }
});

// Redirect if already logged in
onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname.includes('auth.html')) {
        window.location.href = "dashboard.html";
    }
});