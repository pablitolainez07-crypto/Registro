import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// REEMPLAZA ESTO CON TUS DATOS DE FIREBASE
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
let currentEditId = null;

// Control de Sesión
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-section').classList.add('hidden-section');
        document.getElementById('main-dashboard').classList.remove('hidden-section');
        initGrid();
        sync();
    } else {
        document.getElementById('auth-section').classList.remove('hidden-section');
        document.getElementById('main-dashboard').classList.add('hidden-section');
    }
});

// Login
document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('user-email').value;
    const pass = document.getElementById('user-pass').value;
    const isReg = document.getElementById('user-name').style.display === 'block';
    try {
        if (isReg) await createUserWithEmailAndPassword(auth, email, pass);
        else await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) { alert("Error de llave o usuario: " + err.message); }
};

window.toggleAuthMode = () => {
    const ni = document.getElementById('user-name');
    ni.style.display = ni.style.display === 'none' ? 'block' : 'none';
};

function initGrid() {
    const hours = ["07:15 - 07:55", "07:55 - 08:35", "08:35 - 09:15", "09:15 - 09:55", "09:55 - 10:35"];
    const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const body = document.getElementById('schedule-body');
    body.innerHTML = "";
    hours.forEach((h, i) => {
        let row = `<tr><td>${h}</td>`;
        days.forEach(d => {
            const id = `${d}_${i}`;
            row += `<td id="${id}" class="cell-libre" onclick="window.openModal('${id}','${d}','${h}')">Disponible</td>`;
        });
        row += `</tr>`;
        body.innerHTML += row;
    });
}

window.openModal = (id, day, hour) => {
    currentEditId = id;
    document.getElementById('modal-info-text').innerText = `${day} | ${hour}`;
    document.getElementById('modal-edit').classList.remove('hidden-modal');
};

window.saveSlot = async () => {
    const status = document.getElementById('modal-status').value;
    const desc = document.getElementById('modal-comment').value;
    await setDoc(doc(db, "horarios", currentEditId), {
        status,
        desc: status === 'libre' ? "" : desc,
        user: currentUser.email
    });
    window.closeModal();
};

function sync() {
    onSnapshot(collection(db, "horarios"), (snap) => {
        snap.forEach(d => {
            const cell = document.getElementById(d.id);
            if (cell) {
                const data = d.data();
                cell.className = `cell-${data.status}`;
                cell.innerHTML = data.status === 'libre' ? "Disponible" : `<b>${data.status.toUpperCase()}</b><br>${data.desc}`;
            }
        });
    });
}

window.closeModal = () => document.getElementById('modal-edit').classList.add('hidden-modal');
window.logout = () => signOut(auth);
window.toggleCommentField = () => {
    const s = document.getElementById('modal-status').value;
    document.getElementById('comment-section').classList.toggle('hidden', s === 'libre');
};