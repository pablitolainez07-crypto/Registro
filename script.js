import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO_ID",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentLab = null;
let currentEditId = null;

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const timeSlots = [
    { label: "07:15 - 07:55" }, { label: "07:55 - 08:35" }, { label: "08:35 - 09:15" },
    { label: "09:15 - 09:55" }, { label: "09:55 - 10:35" }, { label: "11:05 - 11:40" },
    { label: "11:40 - 12:15" }, { label: "12:15 - 12:55" }, { label: "12:55 - 13:35" }
];

// NAVEGACIÓN DE VISTAS
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

// ACCIONES DE AUTH
document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('user-email').value;
    const pass = document.getElementById('user-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) { 
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
        } catch (e2) { alert("Error: " + e2.message); }
    }
};

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

window.logout = () => signOut(auth);

// GENERAR HORARIO
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
            cell.innerText = "Disponible";
            cell.onclick = () => window.openEditModal(id, day, slot.label);
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
}

// MODAL Y GUARDADO
window.openEditModal = (id, day, time) => {
    const cell = document.getElementById(id);
    if (cell.dataset.status && cell.dataset.status !== 'libre' && cell.dataset.owner !== currentUser.uid) {
        alert("Espacio ocupado por otro docente."); return;
    }
    currentEditId = id;
    document.getElementById('modal-info-text').innerText = `${day} | ${time}`;
    document.getElementById('modal-teacher').value = currentUser.email.split('@')[0];
    document.getElementById('modal-edit').classList.remove('hidden-modal');
    window.toggleCommentField();
};

window.saveSlot = async () => {
    const status = document.getElementById('modal-status').value;
    const desc = document.getElementById('modal-comment').value;
    
    const data = {
        status: status,
        teacher: status === 'libre' ? "" : currentUser.email.split('@')[0],
        owner: status === 'libre' ? "" : currentUser.uid,
        description: status === 'libre' ? "" : desc,
        timestamp: serverTimestamp()
    };
    
    await setDoc(doc(db, "labs", currentLab, "slots", currentEditId), data);
    document.getElementById('modal-comment').value = "";
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
                    `<b>${val.status.toUpperCase()}</b><br><small>${val.teacher}</small><br><span style="font-size:0.7rem">${val.description}</span>`;
                cell.dataset.status = val.status;
                cell.dataset.owner = val.owner;
            }
        });
    });
}

window.closeModal = () => document.getElementById('modal-edit').classList.add('hidden-modal');
window.toggleCommentField = () => {
    const s = document.getElementById('modal-status').value;
    document.getElementById('comment-section').style.display = (s === 'libre') ? 'none' : 'block';
};