import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, addDoc, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// REEMPLAZAR CON TUS DATOS REALES DE FIREBASE
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

// AUTH LOGIC
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        document.getElementById('auth-section').classList.add('hidden-section');
        document.getElementById('selection-section').classList.remove('hidden-section');
    } else {
        document.getElementById('auth-section').classList.remove('hidden-section');
        document.getElementById('selection-section').classList.add('hidden-section');
        document.getElementById('main-dashboard').classList.add('hidden-section');
    }
});

// FUNCIONES GLOBALES (ACCESIBLES DESDE HTML)
window.toggleAuthMode = () => {
    const nameInput = document.getElementById('user-name');
    const btn = document.getElementById('btn-action');
    nameInput.style.display = nameInput.style.display === 'none' ? 'block' : 'none';
    btn.innerText = nameInput.style.display === 'block' ? 'Registrarse' : 'Iniciar Sesión';
};

window.enterLab = (labName) => {
    currentLab = labName;
    document.getElementById('selection-section').classList.add('hidden-section');
    document.getElementById('main-dashboard').classList.remove('hidden-section');
    document.getElementById('current-lab-title').innerText = labName;
    generateGrid();
    loadSlots();
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
            // SE ASIGNA EL EVENTO AQUÍ
            cell.onclick = () => window.openEditModal(id, day, slot.label);
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
}

window.openEditModal = (id, day, time) => {
    const cell = document.getElementById(id);
    if (cell.dataset.status && cell.dataset.status !== 'free' && cell.dataset.owner !== currentUser.uid) {
        alert("Espacio reservado por otro docente."); 
        return;
    }
    currentEditId = id;
    document.getElementById('modal-info-text').innerText = `${day} | ${time}`;
    document.getElementById('modal-teacher').value = currentUser.email.split('@')[0];
    document.getElementById('modal-edit').classList.remove('hidden-modal');
    window.toggleCommentField();
};

window.saveSlot = async () => {
    const status = document.getElementById('modal-status').value;
    const comment = document.getElementById('modal-comment').value;
    const idx = currentEditId.split('_')[1];
    
    const data = {
        status, 
        teacher: status === 'free' ? "" : currentUser.email.split('@')[0],
        owner: status === 'free' ? "" : currentUser.uid,
        comment: status === 'free' ? "" : comment,
        endTime: timeSlots[idx].end, 
        day: currentEditId.split('_')[0]
    };
    
    await setDoc(doc(db, "labs", currentLab, "slots", currentEditId), data);
    window.closeModal();
};

function loadSlots() {
    onSnapshot(collection(db, "labs", currentLab, "slots"), (snap) => {
        snap.forEach(docSnap => {
            const cell = document.getElementById(docSnap.id);
            if (cell) {
                const data = docSnap.data();
                cell.className = data.status === 'free' ? 'cell-free' : (data.status === 'reserved' ? 'cell-reserved' : 'cell-occupied');
                cell.innerHTML = data.status === 'free' ? "Disponible" : `<b>${data.status.toUpperCase()}</b><br><small>${data.teacher}</small>`;
                cell.dataset.status = data.status;
                cell.dataset.owner = data.owner;
            }
        });
    });
}

window.closeModal = () => document.getElementById('modal-edit').classList.add('hidden-modal');
window.logout = () => signOut(auth);
window.toggleCommentField = () => {
    const s = document.getElementById('modal-status').value;
    document.getElementById('comment-section').style.display = (s === 'free') ? 'none' : 'block';
};