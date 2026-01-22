import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- CONFIGURACIÓN DE FIREBASE (USA TUS DATOS) ---
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

// GESTIÓN DE ESTADO DE USUARIO
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

// LOGIN / REGISTRO
document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('user-email').value;
    const pass = document.getElementById('user-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch {
        try { await createUserWithEmailAndPassword(auth, email, pass); }
        catch (err) { alert("Error: " + err.message); }
    }
};

window.enterLab = (labName) => {
    currentLab = labName;
    document.getElementById('selection-section').classList.add('hidden');
    document.getElementById('main-dashboard').classList.remove('hidden');
    document.getElementById('current-lab-title').innerText = labName;
    initGrid();
    startSync();
};

function initGrid() {
    const hours = ["07:20 - 08:20", "08:25 - 09:25", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00"];
    const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = "";

    hours.forEach((h, i) => {
        let row = `<tr><td><strong>${h}</strong></td>`;
        days.forEach(d => {
            const id = `${d}_${i}`;
            row += `<td id="${id}" class="cell-libre" onclick="window.tryEdit('${id}', '${d}', '${h}')">Disponible</td>`;
        });
        row += `</tr>`;
        tbody.appendChild(row);
    });
}

// LÓGICA DE PROTECCIÓN Y APERTURA DE MODAL
window.tryEdit = (id, day, hour) => {
    const cell = document.getElementById(id);
    const owner = cell.dataset.owner;

    // Si la celda está reservada por OTRO, bloquear.
    if (owner && owner !== currentUser.uid) {
        alert("🔒 Este espacio ya fue gestionado por otro docente.");
        return;
    }

    currentEditId = id;
    document.getElementById('modal-info-text').innerText = `${day} | ${hour}`;
    document.getElementById('modal-edit').classList.remove('hidden');
    window.toggleFields();
};

window.saveSlot = async () => {
    const status = document.getElementById('modal-status').value;
    const desc = document.getElementById('modal-comment').value;
    const teacherName = currentUser.email.split('@')[0].toUpperCase();

    const data = {
        status: status,
        desc: status === 'libre' ? "" : desc,
        teacher: status === 'libre' ? "" : teacherName,
        owner: status === 'libre' ? "" : currentUser.uid,
        updated: serverTimestamp()
    };

    await setDoc(doc(db, "labs", currentLab, "slots", currentEditId), data);
    document.getElementById('modal-comment').value = "";
    window.closeModal();
};

function startSync() {
    onSnapshot(collection(db, "labs", currentLab, "slots"), (snap) => {
        snap.forEach(d => {
            const cell = document.getElementById(d.id);
            if (cell) {
                const val = d.data();
                cell.className = `cell-${val.status}`;
                cell.dataset.owner = val.owner;
                
                if (val.status === 'libre') {
                    cell.innerHTML = "Disponible";
                } else {
                    cell.innerHTML = `
                        <span class="teacher-tag">👤 ${val.teacher}</span>
                        <b>${val.status.toUpperCase()}</b>
                        <span class="desc-tag">${val.desc}</span>
                    `;
                }
            }
        });
    });
}

window.toggleFields = () => {
    const s = document.getElementById('modal-status').value;
    document.getElementById('extra-fields').style.display = (s === 'libre') ? 'none' : 'block';
};
window.closeModal = () => document.getElementById('modal-edit').classList.add('hidden');
window.goBack = () => { document.getElementById('main-dashboard').classList.add('hidden'); document.getElementById('selection-section').classList.remove('hidden'); };
window.logout = () => signOut(auth);