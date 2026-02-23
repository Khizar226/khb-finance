import { auth, db } from "./app.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import * as OTPAuth from "https://cdn.jsdelivr.net/npm/otpauth@9.3.6/dist/otpauth.esm.min.js";
import QRCode from "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm";
import {
    hashText,
    generateRecoveryCodes,
    downloadTextFile,
    nonEmptyString
} from "./utils.js";

const provider = new GoogleAuthProvider();
const query = new URLSearchParams(window.location.search);
const redirectTarget = query.get("next") || "dashboard.html";

const refs = {
    loginTab: document.getElementById("loginTab"),
    signupTab: document.getElementById("signupTab"),
    authForm: document.getElementById("authForm"),
    authSubmitBtn: document.getElementById("authSubmitBtn"),
    googleBtn: document.getElementById("googleLoginBtn"),
    authSection: document.getElementById("authSection"),
    setupSection: document.getElementById("setupSection"),
    challengeSection: document.getElementById("challengeSection"),
    authAlert: document.getElementById("authAlert"),
    nameFieldWrap: document.getElementById("nameFieldWrap"),
    confirmFieldWrap: document.getElementById("confirmFieldWrap"),
    pinFieldWrap: document.getElementById("pinFieldWrap"),
    displayName: document.getElementById("displayName"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    confirmPassword: document.getElementById("confirmPassword"),
    financePin: document.getElementById("financePin"),
    setupPinWrap: document.getElementById("setupPinWrap"),
    setupPin: document.getElementById("setupPin"),
    totpQrImage: document.getElementById("totpQrImage"),
    manualSecret: document.getElementById("manualSecret"),
    recoveryList: document.getElementById("recoveryList"),
    downloadRecoveryBtn: document.getElementById("downloadRecoveryBtn"),
    setupTotpCode: document.getElementById("setupTotpCode"),
    confirmSetupBtn: document.getElementById("confirmSetupBtn"),
    cancelSetupBtn: document.getElementById("cancelSetupBtn"),
    challengePin: document.getElementById("challengePin"),
    challengeCode: document.getElementById("challengeCode"),
    verifyChallengeBtn: document.getElementById("verifyChallengeBtn"),
    challengeSignOutBtn: document.getElementById("challengeSignOutBtn"),
    themeToggleBtn: document.getElementById("themeToggleBtn")
};

const state = {
    mode: query.get("mode") === "signup" ? "signup" : "login",
    currentUser: null,
    profileRef: null,
    profile: null,
    pendingPinHash: null,
    setupSecretBase32: "",
    setupTotp: null,
    setupRecoveryCodes: [],
    authBusy: false
};

function initTheme() {
    const saved = localStorage.getItem("finance_theme");
    if (saved === "dark" || saved === "light") {
        document.documentElement.setAttribute("data-theme", saved);
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("finance_theme", next);
}

function showAlert(message, kind = "error") {
    refs.authAlert.textContent = message;
    refs.authAlert.className = `alert ${kind}`;
}

function clearAlert() {
    refs.authAlert.textContent = "";
    refs.authAlert.className = "alert hidden";
}

function setMode(mode) {
    state.mode = mode;
    const signup = mode === "signup";

    refs.loginTab.classList.toggle("active", !signup);
    refs.signupTab.classList.toggle("active", signup);
    refs.nameFieldWrap.classList.toggle("hidden", !signup);
    refs.confirmFieldWrap.classList.toggle("hidden", !signup);
    refs.pinFieldWrap.classList.toggle("hidden", !signup);

    refs.authSubmitBtn.textContent = signup ? "Create Secure Account" : "Log In";
    refs.password.setAttribute("autocomplete", signup ? "new-password" : "current-password");
    refs.authForm.reset();
    clearAlert();
}

function showSection(section) {
    refs.authSection.classList.add("hidden");
    refs.setupSection.classList.add("hidden");
    refs.challengeSection.classList.add("hidden");

    if (section === "auth") {
        refs.authSection.classList.remove("hidden");
    }
    if (section === "setup") {
        refs.setupSection.classList.remove("hidden");
    }
    if (section === "challenge") {
        refs.challengeSection.classList.remove("hidden");
    }
}

function setUnlockedSession(user) {
    sessionStorage.setItem("finance_unlock_uid", user.uid);
    sessionStorage.setItem("finance_unlock_expires", String(Date.now() + (12 * 60 * 60 * 1000)));
}

function hasUnlockedSession(user) {
    const unlockUid = sessionStorage.getItem("finance_unlock_uid");
    const expiresAt = Number(sessionStorage.getItem("finance_unlock_expires") || "0");
    return unlockUid === user.uid && Date.now() < expiresAt;
}

function validPinFormat(pin) {
    return /^\d{6}$/.test(pin);
}

function createTotp(base32Secret, label) {
    return new OTPAuth.TOTP({
        issuer: "Finance Fortress",
        label,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(base32Secret)
    });
}

async function ensureUserProfile(user) {
    const profileRef = doc(db, "users", user.uid);
    const snap = await getDoc(profileRef);

    const defaults = {
        email: user.email || "",
        displayName: user.displayName || "",
        twoFactorEnabled: false,
        pinHash: "",
        totpSecret: "",
        recoveryCodeHashes: [],
        usedRecoveryCodeHashes: []
    };

    if (!snap.exists()) {
        await setDoc(profileRef, {
            ...defaults,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
        return { ref: profileRef, data: defaults };
    }

    const data = { ...defaults, ...snap.data() };
    return { ref: profileRef, data };
}

async function startSetupFlow(user, profile) {
    state.currentUser = user;
    state.profile = profile;
    state.profileRef = doc(db, "users", user.uid);

    const pinMissing = !profile.pinHash && !state.pendingPinHash;
    refs.setupPinWrap.classList.toggle("hidden", !pinMissing);

    const secret = new OTPAuth.Secret({ size: 20 });
    const base32Secret = secret.base32;
    const totp = createTotp(base32Secret, user.email || user.uid);

    state.setupSecretBase32 = base32Secret;
    state.setupTotp = totp;
    state.setupRecoveryCodes = generateRecoveryCodes(10);

    refs.manualSecret.textContent = base32Secret;
    refs.recoveryList.innerHTML = state.setupRecoveryCodes.map((code) => `<li>${code}</li>`).join("");

    const qrData = await QRCode.toDataURL(totp.toString(), {
        width: 180,
        margin: 1
    });

    refs.totpQrImage.src = qrData;
    refs.setupTotpCode.value = "";
    refs.setupPin.value = "";

    showSection("setup");
    showAlert("Scan QR, save recovery codes, then verify one code to enable 2FA.", "success");
}

async function handleAuthenticatedUser(user) {
    if (!user || state.authBusy) {
        return;
    }

    state.authBusy = true;

    try {
        if (hasUnlockedSession(user)) {
            window.location.href = redirectTarget;
            return;
        }

        const profileBundle = await ensureUserProfile(user);
        state.currentUser = user;
        state.profileRef = profileBundle.ref;
        state.profile = profileBundle.data;

        const readyForChallenge = Boolean(
            state.profile.twoFactorEnabled &&
            state.profile.pinHash &&
            state.profile.totpSecret
        );

        if (readyForChallenge) {
            refs.challengePin.value = "";
            refs.challengeCode.value = "";
            showSection("challenge");
            showAlert("Primary login complete. Enter PIN and authenticator code.", "success");
        } else {
            await startSetupFlow(user, state.profile);
        }
    } catch (error) {
        console.error(error);
        showAlert(error.message || "Failed to load security profile.");
        showSection("auth");
    } finally {
        state.authBusy = false;
    }
}

async function handleSignup() {
    const displayName = nonEmptyString(refs.displayName.value);
    const email = nonEmptyString(refs.email.value);
    const password = refs.password.value;
    const confirmPassword = refs.confirmPassword.value;
    const financePin = nonEmptyString(refs.financePin.value);

    if (!displayName) {
        showAlert("Full name is required.");
        return;
    }

    if (password.length < 10) {
        showAlert("Password must be at least 10 characters.");
        return;
    }

    if (password !== confirmPassword) {
        showAlert("Password confirmation does not match.");
        return;
    }

    if (!validPinFormat(financePin)) {
        showAlert("Finance PIN must be exactly 6 digits.");
        return;
    }

    refs.authSubmitBtn.disabled = true;
    refs.authSubmitBtn.textContent = "Creating account...";

    try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
            await updateProfile(credential.user, { displayName });
        }

        state.pendingPinHash = await hashText(financePin);

        await setDoc(doc(db, "users", credential.user.uid), {
            email,
            displayName,
            pinHash: state.pendingPinHash,
            twoFactorEnabled: false,
            recoveryCodeHashes: [],
            usedRecoveryCodeHashes: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });

        await startSetupFlow(credential.user, {
            email,
            displayName,
            pinHash: state.pendingPinHash,
            twoFactorEnabled: false,
            recoveryCodeHashes: [],
            usedRecoveryCodeHashes: []
        });
    } catch (error) {
        console.error(error);
        showAlert(error.message || "Sign up failed.");
    } finally {
        refs.authSubmitBtn.disabled = false;
        refs.authSubmitBtn.textContent = "Create Secure Account";
    }
}

async function handleLoginWithEmail() {
    const email = nonEmptyString(refs.email.value);
    const password = refs.password.value;

    refs.authSubmitBtn.disabled = true;
    refs.authSubmitBtn.textContent = "Authenticating...";

    try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await handleAuthenticatedUser(credential.user);
    } catch (error) {
        console.error(error);
        showAlert(error.message || "Login failed.");
    } finally {
        refs.authSubmitBtn.disabled = false;
        refs.authSubmitBtn.textContent = "Log In";
    }
}

async function handleGoogleLogin() {
    refs.googleBtn.disabled = true;
    refs.googleBtn.textContent = "Connecting...";

    try {
        const result = await signInWithPopup(auth, provider);
        await ensureUserProfile(result.user);
        await handleAuthenticatedUser(result.user);
    } catch (error) {
        console.error(error);
        showAlert(error.message || "Google login failed.");
    } finally {
        refs.googleBtn.disabled = false;
        refs.googleBtn.textContent = "Continue With Google";
    }
}

async function confirmSetup() {
    if (!state.currentUser || !state.setupTotp || !state.setupSecretBase32) {
        showAlert("Setup session expired. Please login again.");
        return;
    }

    if (!state.pendingPinHash && !state.profile?.pinHash) {
        const setupPin = nonEmptyString(refs.setupPin.value);
        if (!validPinFormat(setupPin)) {
            showAlert("Set a valid 6-digit Finance PIN.");
            return;
        }
        state.pendingPinHash = await hashText(setupPin);
    }

    const token = nonEmptyString(refs.setupTotpCode.value).replace(/\s+/g, "");
    if (!/^\d{6}$/.test(token)) {
        showAlert("Enter a valid 6-digit authenticator code.");
        return;
    }

    const delta = state.setupTotp.validate({ token, window: 1 });
    if (delta === null) {
        showAlert("Authenticator code is invalid or expired.");
        return;
    }

    refs.confirmSetupBtn.disabled = true;
    refs.confirmSetupBtn.textContent = "Saving 2FA...";

    try {
        const recoveryCodeHashes = await Promise.all(
            state.setupRecoveryCodes.map((code) => hashText(code.toUpperCase()))
        );

        const finalPinHash = state.pendingPinHash || state.profile?.pinHash;
        if (!finalPinHash) {
            throw new Error("PIN hash missing. Retry setup.");
        }

        await updateDoc(state.profileRef, {
            pinHash: finalPinHash,
            twoFactorEnabled: true,
            totpSecret: state.setupSecretBase32,
            recoveryCodeHashes,
            usedRecoveryCodeHashes: [],
            updatedAt: serverTimestamp(),
            lastTwoFactorSetupAt: serverTimestamp()
        });

        setUnlockedSession(state.currentUser);
        showAlert("2FA enabled. Redirecting to dashboard...", "success");
        setTimeout(() => {
            window.location.href = redirectTarget;
        }, 600);
    } catch (error) {
        console.error(error);
        showAlert(error.message || "Failed to enable 2FA.");
    } finally {
        refs.confirmSetupBtn.disabled = false;
        refs.confirmSetupBtn.textContent = "Enable 2FA & Continue";
    }
}

async function verifyChallenge() {
    if (!state.currentUser || !state.profile) {
        showAlert("Session not ready. Please login again.");
        return;
    }

    const pin = nonEmptyString(refs.challengePin.value);
    const code = nonEmptyString(refs.challengeCode.value).toUpperCase();

    if (!validPinFormat(pin)) {
        showAlert("Finance PIN must be 6 digits.");
        return;
    }

    if (!code) {
        showAlert("Enter authenticator or recovery code.");
        return;
    }

    refs.verifyChallengeBtn.disabled = true;
    refs.verifyChallengeBtn.textContent = "Verifying...";

    try {
        const pinHash = await hashText(pin);
        if (pinHash !== state.profile.pinHash) {
            throw new Error("Invalid Finance PIN.");
        }

        let recoveryHashUsed = "";

        if (/^\d{6}$/.test(code)) {
            const totp = createTotp(state.profile.totpSecret, state.currentUser.email || state.currentUser.uid);
            const delta = totp.validate({ token: code, window: 1 });
            if (delta === null) {
                throw new Error("Authenticator code is invalid or expired.");
            }
        } else {
            const recoveryHash = await hashText(code);
            const allowed = state.profile.recoveryCodeHashes || [];
            const used = state.profile.usedRecoveryCodeHashes || [];
            if (!allowed.includes(recoveryHash)) {
                throw new Error("Recovery code is invalid.");
            }
            if (used.includes(recoveryHash)) {
                throw new Error("Recovery code already used.");
            }
            recoveryHashUsed = recoveryHash;
        }

        const patch = {
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            lastSecondFactorAt: serverTimestamp()
        };

        if (recoveryHashUsed) {
            patch.usedRecoveryCodeHashes = arrayUnion(recoveryHashUsed);
        }

        await updateDoc(state.profileRef, patch);
        setUnlockedSession(state.currentUser);

        showAlert("Verification successful. Opening dashboard...", "success");
        setTimeout(() => {
            window.location.href = redirectTarget;
        }, 300);
    } catch (error) {
        console.error(error);
        showAlert(error.message || "2FA verification failed.");
    } finally {
        refs.verifyChallengeBtn.disabled = false;
        refs.verifyChallengeBtn.textContent = "Verify & Open Dashboard";
    }
}

function downloadRecoveryCodes() {
    if (!state.setupRecoveryCodes.length) {
        showAlert("No recovery codes available to download.");
        return;
    }

    const content = [
        "Finance Fortress Recovery Codes",
        `Generated: ${new Date().toLocaleString("en-PK")}`,
        "",
        ...state.setupRecoveryCodes,
        "",
        "Each code can be used one time only."
    ].join("\n");

    downloadTextFile("finance-recovery-codes.txt", content);
}

function bindEvents() {
    refs.themeToggleBtn.addEventListener("click", toggleTheme);
    refs.loginTab.addEventListener("click", () => setMode("login"));
    refs.signupTab.addEventListener("click", () => setMode("signup"));

    refs.authForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearAlert();
        if (state.mode === "signup") {
            await handleSignup();
            return;
        }
        await handleLoginWithEmail();
    });

    refs.googleBtn.addEventListener("click", async () => {
        clearAlert();
        await handleGoogleLogin();
    });

    refs.confirmSetupBtn.addEventListener("click", confirmSetup);
    refs.downloadRecoveryBtn.addEventListener("click", downloadRecoveryCodes);
    refs.cancelSetupBtn.addEventListener("click", async () => {
        await signOut(auth);
        state.pendingPinHash = null;
        showSection("auth");
        setMode("login");
    });

    refs.verifyChallengeBtn.addEventListener("click", verifyChallenge);
    refs.challengeSignOutBtn.addEventListener("click", async () => {
        await signOut(auth);
        showSection("auth");
        setMode("login");
    });
}

async function init() {
    initTheme();
    bindEvents();
    setMode(state.mode);
    showSection("auth");

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            state.currentUser = null;
            state.profile = null;
            state.profileRef = null;
            state.pendingPinHash = null;
            return;
        }
        await handleAuthenticatedUser(user);
    });
}

init();
