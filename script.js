import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCNRk2mrp53kE3YWdjWgFKQlDu0V0wQ6AI",
    authDomain: "sistema-de-registro-prueba.firebaseapp.com",
    projectId: "sistema-de-registro-prueba",
    storageBucket: "sistema-de-registro-prueba.firebasestorage.app",
    messagingSenderId: "379449407833",
    appId: "1:379449407833:web:78859a62d5b06cccdb3448"

};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentLab = null;
let currentEditId = null;

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const timeSlots = [
    { start: "07:15", end: "07:55", label: "07:15 - 07:55" },
    { start: "07:55", end: "08:35", label: "07:55 - 08:35" },
    { start: "08:35", end: "09:15", label: "08:35 - 09:15" },
    { start: "09:15", end: "09:55", label: "09:15 - 09:55" },
    { start: "09:55", end: "10:35", label: "09:55 - 10:35" },
    { start: "11:05", end: "11:40", label: "11:05 - 11:40" },
    { start: "11:40", end: "12:15", label: "11:40 - 12:15" },
    { start: "12:15", end: "12:55", label: "12:15 - 12:55" },
    { start: "12:55", end: "13:35", label: "12:55 - 13:35" }
];

// AUTH OBSERVER - Maneja qué sección se muestra
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        document.getElementById('auth-section').classList.add('hidden-section');
        document.getElementById('selection-section').classList.remove('hidden-section');
        document.getElementById('main-dashboard').classList.add('hidden-section');
    } else {
        document.getElementById('auth-section').classList.remove('hidden-section');
        document.getElementById('selection-section').classList.add('hidden-section');
        document.getElementById('main-dashboard').classList.add('hidden-section');
    }
});

// LOGIN / REGISTER
document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('user-email').value;
    const pass = document.getElementById('user-pass').value;
    const isRegister = document.getElementById('user-name').style.display === 'block';
    try {
        if (isRegister) await createUserWithEmailAndPassword(auth, email, pass);
        else await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) { document.getElementById('auth-error').innerText = "Error: " + err.message; }
};

window.toggleAuthMode = () => {
    const nameInput = document.getElementById('user-name');
    nameInput.style.display = nameInput.style.display === 'none' ? 'block' : 'none';
};

// LABORATORIO
window.enterLab = (labName) => {
    currentLab = labName;
    document.getElementById('selection-section').classList.add('hidden-section');
    document.getElementById('main-dashboard').classList.remove('hidden-section');
    document.getElementById('current-lab-title').innerText = labName;
    generateGrid();
    loadSlots();
};

window.goBack = () => {
    document.getElementById('main-dashboard').classList.add('hidden-section');
    document.getElementById('selection-section').classList.remove('hidden-section');
};

function generateGrid() {
    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = "";
    timeSlots.forEach((slot, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td><strong>${slot.label}</strong></td>`;
        days.forEach(day => {
            const id = `${day}_${idx}`;
            const cell = document.createElement('td');
            cell.id = id;
            cell.className = "cell-free";
            cell.innerHTML = "Disponible";
            cell.onclick = () => window.openEditModal(id, day, slot.label);
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
}

window.openEditModal = (id, day, time) => {
    const cell = document.getElementById(id);
    if (cell.dataset.status && cell.dataset.status !== 'free' && cell.dataset.owner !== currentUser.uid) {
        alert("Ocupado por otro docente."); return;
    }
    currentEditId = id;
    document.getElementById('modal-info-text').innerText = `${day} | ${time}`;
    document.getElementById('modal-teacher').value = currentUser.email.split('@')[0];
    document.getElementById('modal-edit').classList.remove('hidden-modal');
};

window.saveSlot = async () => {
    const status = document.getElementById('modal-status').value;
    const comment = document.getElementById('modal-comment').value;
    const data = {
        status, teacher: currentUser.email.split('@')[0],
        owner: currentUser.uid, comment, timestamp: serverTimestamp()
    };
    await setDoc(doc(db, "labs", currentLab, "slots", currentEditId), data);
    window.closeModal();
};

function loadSlots() {
    onSnapshot(collection(db, "labs", currentLab, "slots"), (snap) => {
        snap.forEach(d => {
            const cell = document.getElementById(d.id);
            if (cell) {
                const val = d.data();
                cell.className = val.status === 'free' ? 'cell-free' : (val.status === 'reserved' ? 'cell-reserved' : 'cell-occupied');
                cell.innerHTML = val.status === 'free' ? "Disponible" : `<b>${val.status}</b><br>${val.teacher}`;
                cell.dataset.status = val.status;
                cell.dataset.owner = val.owner;
            }
        });
    });
}

window.closeModal = () => document.getElementById('modal-edit').classList.add('hidden-modal');
window.logout = () => signOut(auth);
window.toggleCommentField = () => { /* opcional */ };