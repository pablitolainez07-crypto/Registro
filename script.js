import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, addDoc, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- TU CONFIGURACIÓN (REEMPLAZAR) ---
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

// Variables Globales
let currentUser = null;
let currentLab = null;
let currentEditId = null; // ID del documento (ej: 'Lunes_0')

// Horas según tu imagen (Inicio - Fin)
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

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

// --- AUTH (Igual que antes) ---
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('user-email').value;
    const pass = document.getElementById('user-pass').value;
    const name = document.getElementById('user-name').value;
    
    try {
        if (document.getElementById('user-name').style.display === 'block') {
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", cred.user.uid), { name: name, email: email });
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (error) {
        document.getElementById('auth-error').innerText = error.message;
    }
});

window.toggleAuthMode = () => {
    const nameInput = document.getElementById('user-name');
    nameInput.style.display = nameInput.style.display === 'none' ? 'block' : 'none';
    document.getElementById('btn-action').innerText = nameInput.style.display === 'block' ? "Registrarse" : "Iniciar Sesión";
};

window.logout = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('selection-section').style.display = 'block';
        document.getElementById('dashboard-section').style.display = 'none';
        document.getElementById('display-name').innerText = user.email;
    } else {
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('selection-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'none';
    }
});

// --- GENERACIÓN DE TABLA Y LÓGICA DE LABORATORIO ---
window.enterLab = (labName) => {
    currentLab = labName;
    document.getElementById('selection-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('current-lab-title').innerText = labName;
    
    generateGrid();
    loadSlots();
    loadNotifications();
    
    // Iniciar chequeo automático de expiración
    setInterval(checkTimeExpiration, 60000); // Chequear cada minuto
};

window.goBack = () => {
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('selection-section').style.display = 'block';
};

function generateGrid() {
    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = "";

    timeSlots.forEach((slot, index) => {
        const row = document.createElement('tr');
        
        // Columna Hora
        const th = document.createElement('td');
        th.innerHTML = `<strong>${slot.label}</strong>`;
        th.style.background = "#eee";
        row.appendChild(th);

        // Columnas Días
        days.forEach(day => {
            const cell = document.createElement('td');
            const cellId = `${day}_${index}`; // ID único: Ej: "Lunes_0"
            cell.id = cellId;
            cell.className = "cell-free";
            cell.innerText = "Disponible";
            cell.onclick = () => openEditModal(cellId, day, slot.label);
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
}

// --- ESCUCHAR CAMBIOS EN BASE DE DATOS ---
function loadSlots() {
    const q = collection(db, "labs", currentLab, "slots");
    onSnapshot(q, (snapshot) => {
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const cell = document.getElementById(docSnap.id);
            if (cell) {
                updateCellVisuals(cell, data);
            }
        });
    });
}

function updateCellVisuals(cell, data) {
    if (data.status === 'free') {
        cell.className = 'cell-free';
        cell.innerHTML = "Disponible";
    } else {
        cell.className = data.status === 'reserved' ? 'cell-reserved' : 'cell-occupied';
        cell.innerHTML = `
            <strong>${data.status === 'reserved' ? 'Reservado' : 'Ocupado'}</strong><br>
            <small>${data.teacherName || 'Docente'}</small>
        `;
    }
    // Guardamos datos en el elemento para validación
    cell.dataset.ownerId = data.ownerId; 
    cell.dataset.status = data.status;
}

// --- MODAL Y PERMISOS ---
window.openEditModal = async (cellId, day, timeLabel) => {
    const cell = document.getElementById(cellId);
    const status = cell.dataset.status || 'free';
    const ownerId = cell.dataset.ownerId;

    // 3) PERMISOS: Solo el creador puede modificar (si no está libre)
    if (status !== 'free' && ownerId !== currentUser.uid) {
        alert("⛔ No puedes modificar este horario porque fue reservado por otro docente.");
        return;
    }

    currentEditId = cellId;
    document.getElementById('modal-day').innerText = day;
    document.getElementById('modal-time').innerText = timeLabel;
    document.getElementById('modal-edit').classList.remove('hidden-modal');
    
    // Resetear form
    document.getElementById('modal-status').value = status;
    document.getElementById('modal-teacher').value = currentUser.email;
    toggleCommentField();
};

window.saveSlot = async () => {
    const status = document.getElementById('modal-status').value;
    const comment = document.getElementById('modal-comment').value;
    
    // Obtenemos hora final para la lógica de auto-liberación
    const timeIndex = currentEditId.split('_')[1];
    const endTime = timeSlots[timeIndex].end; 
    const dayName = currentEditId.split('_')[0];

    const data = {
        status: status,
        ownerId: status === 'free' ? null : currentUser.uid,
        teacherName: status === 'free' ? null : currentUser.email.split('@')[0], // Nombre corto
        comment: comment,
        day: dayName,
        endTime: endTime, // Guardamos la hora de fin "07:55"
        timestamp: serverTimestamp()
    };

    await setDoc(doc(db, "labs", currentLab, "slots", currentEditId), data);

    // Notificación de Cambio de Horario
    if (status !== 'free') {
        await addDoc(collection(db, "notifications"), {
            lab: currentLab,
            msg: `${dayName} ${timeSlots[timeIndex].start}: ${status.toUpperCase()} por ${data.teacherName}`,
            type: 'schedule',
            timestamp: serverTimestamp()
        });
    }

    closeModal();
};

window.closeModal = () => document.getElementById('modal-edit').classList.add('hidden-modal');
window.toggleCommentField = () => {
    const val = document.getElementById('modal-status').value;
    document.getElementById('comment-section').style.display = val === 'free' ? 'none' : 'block';
};

// --- 2) LÓGICA DE AUTO-LIBERACIÓN ---
function checkTimeExpiration() {
    const now = new Date();
    // Conseguir día actual en texto (Lunes, Martes...)
    const daysMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const todayName = daysMap[now.getDay()];
    
    // Formato hora actual "HH:MM" para comparar strings
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    // Revisar todas las celdas en el DOM (o podrías leer la DB, pero DOM es más barato aquí)
    const cells = document.querySelectorAll('td[id]');
    
    cells.forEach(async (cell) => {
        const cellId = cell.id; // Ej: Lunes_0
        const [day, index] = cellId.split('_');
        
        // Si la celda está ocupada y es HOY
        if (cell.dataset.status && cell.dataset.status !== 'free' && day === todayName) {
            const slotEndTime = timeSlots[index].end; // "07:55"
            
            // Si la hora actual es mayor a la hora de fin
            if (currentTimeStr > slotEndTime) {
                console.log(`Liberando slot vencido: ${cellId}`);
                // Actualizar en Firebase
                await updateDoc(doc(db, "labs", currentLab, "slots", cellId), {
                    status: 'free',
                    ownerId: null,
                    comment: '',
                    teacherName: null
                });
            }
        }
    });
}

// --- 4) NOTIFICACIONES SEPARADAS ---
function loadNotifications() {
    const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"), limit(20));
    
    onSnapshot(q, (snapshot) => {
        const schedList = document.getElementById('notif-schedule-list');
        const faultList = document.getElementById('notif-fault-list');
        schedList.innerHTML = "";
        faultList.innerHTML = "";

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.lab !== currentLab) return; // Filtrar por lab actual

            const li = document.createElement('li');
            li.innerText = data.msg;

            if (data.type === 'bug') {
                faultList.appendChild(li);
            } else {
                schedList.appendChild(li);
            }
        });
    });
}

window.sendReport = async () => {
    const text = document.getElementById('report-text').value;
    if (!text) return;
    
    await addDoc(collection(db, "notifications"), {
        lab: currentLab,
        msg: `⚠️ FALLA: ${text} (Reportado por: ${currentUser.email})`,
        type: 'bug',
        timestamp: serverTimestamp()
    });
    document.getElementById('report-text').value = "";
    alert("Falla reportada.");
};