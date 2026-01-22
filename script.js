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

let currentUser = null, currentLab = null, currentEditId = null;
const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const timeSlots = ["07:15 - 07:55", "07:55 - 08:35", "08:35 - 09:15", "09:15 - 09:55", "09:55 - 10:35", "11:05 - 11:40", "11:40 - 12:15"];

// AUTH LOGIC
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('selection-section').classList.remove('hidden');
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('selection-section').classList.add('hidden');
        document.getElementById('main-dashboard').classList.add('hidden');
    }
});

// LOGIN / REGISTER
document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('user-email').value;
    const pass = document.getElementById('user-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
        } catch (e2) { document.getElementById('auth-error').innerText = "Error de acceso."; }
    }
};

window.enterLab = (labName) => {
    currentLab = labName;
    document.getElementById('selection-section').classList.add('hidden');
    document.getElementById('main-dashboard').classList.remove('hidden');
    document.getElementById('current-lab-title').innerText = labName;
    generateGrid();
    loadSlots();
};

function generateGrid() {
    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = "";
    timeSlots.forEach((slot, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td class="time-cell"><strong>${slot}</strong></td>`;
        days.forEach(day => {
            const id = `${day}_${idx}`;
            const cell = document.createElement('td');
            cell.id = id;
            cell.className = "cell-libre";
            cell.innerHTML = "<span>Disponible</span>";
            cell.onclick = () => window.openEditModal(id, day, slot);
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
}

window.openEditModal = (id, day, time) => {
    currentEditId = id;
    document.getElementById('modal-info-text').innerText = `${day} | ${time}`;
    document.getElementById('modal-edit').classList.remove('hidden');
    window.toggleCommentField();
};

window.saveSlot = async () => {
    const status = document.getElementById('modal-status').value;
    const desc = document.getElementById('modal-comment').value;
    const data = {
        status: status,
        description: status === 'libre' ? "" : desc,
        teacher: currentUser.email.split('@')[0],
        owner: currentUser.uid,
        timestamp: serverTimestamp()
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
                cell.className = `cell-${val.status}`;
                cell.innerHTML = val.status === 'libre' ? "Disponible" : 
                    `<strong>${val.status.toUpperCase()}</strong><br><small>${val.description}</small>`;
                cell.dataset.owner = val.owner;
            }
        });
    });
}

window.toggleCommentField = () => {
    const s = document.getElementById('modal-status').value;
    document.getElementById('comment-section').style.display = (s === 'libre') ? 'none' : 'block';
};
window.closeModal = () => document.getElementById('modal-edit').classList.add('hidden');
window.goBack = () => { document.getElementById('main-dashboard').classList.add('hidden'); document.getElementById('selection-section').classList.remove('hidden'); };
window.logout = () => signOut(auth);