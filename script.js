import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, addDoc, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- 1. CONFIGURACIÓN FIREBASE (REEMPLAZA CON TUS DATOS) ---
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

// --- 2. VARIABLES DE ESTADO ---
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

// --- 3. SISTEMA DE AUTENTICACIÓN ---
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        document.getElementById('auth-section').classList.add('hidden-section');
        document.getElementById('main-dashboard').classList.remove('hidden-section');
        document.getElementById('display-name').innerText = user.email;
    } else {
        document.getElementById('auth-section').classList.remove('hidden-section');
        document.getElementById('main-dashboard').classList.add('hidden-section');
    }
});

const authForm = document.getElementById('auth-form');
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('user-email').value;
    const pass = document.getElementById('user-pass').value;
    const nameInput = document.getElementById('user-name');
    const isRegister = nameInput.style.display === 'block';

    try {
        if (isRegister) {
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", cred.user.uid), { name: nameInput.value, email });
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (error) {
        document.getElementById('auth-error').innerText = "Error: " + error.message;
    }
});

window.toggleAuthMode = () => {
    const nameInput = document.getElementById('user-name');
    const btn = document.getElementById('btn-action');
    const isHidden = nameInput.style.display === 'none' || nameInput.style.display === '';
    nameInput.style.display = isHidden ? 'block' : 'none';
    btn.innerText = isHidden ? 'Registrarse' : 'Iniciar Sesión';
};

window.logout = () => signOut(auth);

// --- 4. GESTIÓN DEL LABORATORIO ---
window.enterLab = (labName) => {
    currentLab = labName;
    document.getElementById('current-lab-title').innerText = `Panel: ${labName}`;
    generateGrid();
    loadSlots();
    loadNotifications();
    setInterval(checkTimeExpiration, 60000); // Revisar expiración cada minuto
};

function generateGrid() {
    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = "";
    timeSlots.forEach((slot, index) => {
        const row = document.createElement('tr');
        const tdTime = document.createElement('td');
        tdTime.innerHTML = `<span class="time-tag">${slot.label}</span>`;
        row.appendChild(tdTime);

        days.forEach(day => {
            const cell = document.createElement('td');
            const cellId = `${day}_${index}`;
            cell.id = cellId;
            cell.className = "cell-free";
            cell.innerHTML = '<span class="status-text">Disponible</span>';
            cell.onclick = () => openEditModal(cellId, day, slot.label);
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
}

function loadSlots() {
    const q = collection(db, "labs", currentLab, "slots");
    onSnapshot(q, (snapshot) => {
        snapshot.forEach((docSnap) => {
            const cell = document.getElementById(docSnap.id);
            if (cell) updateCellVisuals(cell, docSnap.data());
        });
    });
}

function updateCellVisuals(cell, data) {
    cell.dataset.status = data.status;
    cell.dataset.ownerId = data.ownerId;
    if (data.status === 'free') {
        cell.className = 'cell-free';
        cell.innerHTML = '<span class="status-text">Disponible</span>';
    } else {
        cell.className = data.status === 'reserved' ? 'cell-reserved' : 'cell-occupied';
        cell.innerHTML = `
            <div class="slot-active">
                <strong>${data.status.toUpperCase()}</strong>
                <p class="prof-name">${data.teacherName || ''}</p>
                <p class="materia-text">${data.comment || ''}</p>
            </div>`;
    }
}

// --- 5. MODAL Y PERMISOS ---
window.openEditModal = (cellId, day, timeLabel) => {
    const cell = document.getElementById(cellId);
    const status = cell.dataset.status || 'free';
    const ownerId = cell.dataset.ownerId;

    if (status !== 'free' && ownerId !== currentUser.uid) {
        alert("Solo el docente que realizó la acción puede modificar este horario.");
        return;
    }

    currentEditId = cellId;
    document.getElementById('modal-day').innerText = day;
    document.getElementById('modal-time').innerText = timeLabel;
    document.getElementById('modal-teacher').value = currentUser.email.split('@')[0];
    document.getElementById('modal-status').value = status;
    document.getElementById('modal-edit').classList.remove('hidden-modal');
    window.toggleCommentField();
};

window.closeModal = () => document.getElementById('modal-edit').classList.add('hidden-modal');

window.toggleCommentField = () => {
    const status = document.getElementById('modal-status').value;
    document.getElementById('comment-section').style.display = status === 'free' ? 'none' : 'block';
};

window.saveSlot = async () => {
    const status = document.getElementById('modal-status').value;
    const comment = document.getElementById('modal-comment').value;
    const day = currentEditId.split('_')[0];
    const index = currentEditId.split('_')[1];

    const data = {
        status,
        comment: status === 'free' ? "" : comment,
        teacherName: status === 'free' ? "" : currentUser.email.split('@')[0],
        ownerId: status === 'free' ? null : currentUser.uid,
        endTime: timeSlots[index].end,
        day: day,
        timestamp: serverTimestamp()
    };

    await setDoc(doc(db, "labs", currentLab, "slots", currentEditId), data);
    
    if (status !== 'free') {
        await addDoc(collection(db, "notifications"), {
            msg: `${day} ${timeSlots[index].start}: ${status.toUpperCase()} por ${data.teacherName}`,
            type: 'schedule',
            lab: currentLab,
            timestamp: serverTimestamp()
        });
    }
    window.closeModal();
};

// --- 6. AUTO-LIBERACIÓN Y REPORTES ---
function checkTimeExpiration() {
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`;
    const dayName = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][now.getDay()];

    document.querySelectorAll('td[id]').forEach(async (cell) => {
        const [day, index] = cell.id.split('_');
        if (cell.dataset.status !== 'free' && day === dayName) {
            if (currentTimeStr > timeSlots[index].end) {
                await updateDoc(doc(db, "labs", currentLab, "slots", cell.id), {
                    status: 'free', ownerId: null, teacherName: "", comment: ""
                });
            }
        }
    });
}

function loadNotifications() {
    const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"), limit(15));
    onSnapshot(q, (snaps) => {
        const sList = document.getElementById('notif-schedule-list');
        const fList = document.getElementById('notif-fault-list');
        sList.innerHTML = ""; fList.innerHTML = "";
        snaps.forEach(d => {
            const val = d.data();
            if (val.lab !== currentLab) return;
            const li = document.createElement('li');
            li.innerText = val.msg;
            val.type === 'bug' ? fList.appendChild(li) : sList.appendChild(li);
        });
    });
}

window.sendReport = async () => {
    const text = document.getElementById('report-text').value;
    if (!text) return;
    await addDoc(collection(db, "notifications"), {
        msg: `⚠️ FALLA: ${text} (${currentUser.email.split('@')[0]})`,
        type: 'bug',
        lab: currentLab,
        timestamp: serverTimestamp()
    });
    document.getElementById('report-text').value = "";
    alert("Reporte enviado.");
};