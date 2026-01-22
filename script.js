import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// REEMPLAZA ESTO CON TUS DATOS REALES DE LA CONSOLA DE FIREBASE
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
        initSchedule();
        syncData();
    } else {
        document.getElementById('auth-section').classList.remove('hidden-section');
        document.getElementById('main-dashboard').classList.add('hidden-section');
    }
});

// Login y Registro
document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('user-email').value;
    const pass = document.getElementById('user-pass').value;
    const isRegister = document.getElementById('user-name').style.display === 'block';

    try {
        if (isRegister) await createUserWithEmailAndPassword(auth, email, pass);
        else await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
        document.getElementById('auth-error').innerText = "Error: Verifica tus credenciales.";
    }
};

window.toggleAuthMode = () => {
    const ni = document.getElementById('user-name');
    ni.style.display = ni.style.display === 'none' ? 'block' : 'none';
};

// Generar Horario
function initSchedule() {
    const hours = ["07:15 - 07:55", "07:55 - 08:35", "08:35 - 09:15", "09:15 - 09:55", "09:55 - 10:35", "11:05 - 11:40", "11:40 - 12:15", "12:15 - 12:55", "12:55 - 13:35"];
    const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    const container = document.getElementById('schedule-body');
    container.innerHTML = "";

    hours.forEach((h, i) => {
        let row = `<tr><td>${h}</td>`;
        days.forEach(d => {
            const id = `${d}_${i}`;
            row += `<td id="${id}" class="cell-libre" onclick="window.openModal('${id}', '${d}', '${h}')">Disponible</td>`;
        });
        row += `</tr>`;
        container.innerHTML += row;
    });
}

// Abrir Modal
window.openModal = (id, day, hour) => {
    currentEditId = id;
    document.getElementById('modal-info-text').innerText = `${day} | ${hour}`;
    document.getElementById('modal-edit').classList.remove('hidden-modal');
};

// Guardar
window.saveSlot = async () => {
    const status = document.getElementById('modal-status').value;
    const desc = document.getElementById('modal-comment').value;

    await setDoc(doc(db, "horarios", currentEditId), {
        status: status,
        description: status === 'libre' ? "" : desc,
        user: currentUser.email
    });
    
    document.getElementById('modal-comment').value = "";
    window.closeModal();
};

// Sincronizar datos de Firebase
function syncData() {
    onSnapshot(collection(db, "horarios"), (snapshot) => {
        snapshot.forEach(doc => {
            const cell = document.getElementById(doc.id);
            if (cell) {
                const data = doc.data();
                cell.className = `cell-${data.status}`;
                cell.innerHTML = data.status === 'libre' ? "Disponible" : `<b>${data.status.toUpperCase()}</b><br>${data.description}`;
            }
        });
    });
}

window.closeModal = () => document.getElementById('modal-edit').classList.add('hidden-modal');
window.logout = () => signOut(auth);
window.toggleCommentField = () => {
    const status = document.getElementById('modal-status').value;
    document.getElementById('comment-section').classList.toggle('hidden', status === 'libre');
};