import { auth, db } from './app.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// --- Authentication Check ---
const appBody = document.getElementById('appBody');
onAuthStateChanged(auth, (user) => {
    if (user) {
        appBody.classList.remove('hidden'); // Show app
        loadDashboardData(user.uid); // <--- Add this line to start fetching data
    } else {
        window.location.href = "auth.html?mode=login"; // Kick back to login
    }
});

// --- Logout ---
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout Error:", error);
    }
});

// --- Theme Toggle ---
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;
themeToggle.addEventListener('click', () => {
    htmlEl.classList.toggle('dark');
});

// --- Modal Logic ---
const modal = document.getElementById('transactionModal');
document.getElementById('openModalBtn').addEventListener('click', () => modal.classList.remove('hidden'));
document.getElementById('closeModalBtn').addEventListener('click', () => modal.classList.add('hidden'));

// --- Handle Single Transaction Submit ---
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const type = document.getElementById('transType').value;
    const amount = parseFloat(document.getElementById('transAmount').value);
    const head = document.getElementById('transHead').value;
    const manualDate = document.getElementById('transDate').value;
    const remarks = document.getElementById('transRemarks').value;

    const data = {
        type, 
        amount, 
        head, 
        remarks,
        timestamp: manualDate ? new Date(manualDate).getTime() : serverTimestamp(),
        createdAt: new Date().toISOString(), 
        editHistory: [],
        uid: auth.currentUser.uid // Links data to your specific account
    };

    try {
        await addDoc(collection(db, "transactions"), data);
        alert("Transaction added successfully!");
        document.getElementById('transactionForm').reset();
        modal.classList.add('hidden');
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Failed to save transaction.");
    }
});

// --- Handle Bulk CSV Upload ---
document.getElementById('processCsvBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];
    if (!file) {
        alert("Please select a CSV file first.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const rows = text.split('\n');
        
        let addedCount = 0;
        // Assume CSV: Date, Type, Head, Amount, Remarks
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',');
            if (cols.length >= 4) {
                const data = {
                    dateStr: cols[0],
                    type: cols[1],
                    head: cols[2],
                    amount: parseFloat(cols[3]),
                    remarks: cols[4] || "",
                    timestamp: serverTimestamp(),
                    createdAt: new Date().toISOString(),
                    isBulkImport: true,
                    uid: auth.currentUser.uid
                };
                try {
                    await addDoc(collection(db, "transactions"), data);
                    addedCount++;
                } catch(err) {
                    console.error("Row import error", err);
                }
            }
        }
        alert(`Successfully imported ${addedCount} transactions!`);
        fileInput.value = ""; // Reset file input
    };
    reader.readAsText(file);

});

