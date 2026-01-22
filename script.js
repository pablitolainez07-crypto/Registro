// Importar funciones de Firebase (Versión Modular v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, addDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- CONFIGURACIÓN FIREBASE (REEMPLAZAR CON TUS DATOS) ---
const firebaseConfig = {
    apiKey: "AIzaSyCNRk2mrp53kE3YWdjWgFKQlDu0V0wQ6AI",
    authDomain: "sistema-de-registro-prueba.firebaseapp.com",
    projectId: "sistema-de-registro-prueba",
    storageBucket: "sistema-de-registro-prueba.firebasestorage.app",
    messagingSenderId: "379449407833",
    ppId: "1:379449407833:web:78859a62d5b06cccdb3448"

};

// Inicializar
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables Globales
let currentUser = null;
let currentLab = null;
let currentSlotId = null; // Para saber qué hora estamos editando

// --- SISTEMA DE AUTENTICACIÓN ---
const authForm = document.getElementById('auth-form');
let isRegistering = false;

window.toggleAuthMode = () => {
    isRegistering = !isRegistering;
    document.getElementById('user-name').style.display = isRegistering ? 'block' : 'none';
    document.getElementById('btn-action').innerText = isRegistering ? 'Registrarse' : 'Iniciar Sesión';
    document.getElementById('auth-title').innerText = isRegistering ? 'Registro Docente' : 'Iniciar Sesión';
};

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('user-email').value;
    const pass = document.getElementById('user-pass').value;
    const name = document.getElementById('user-name').value;
    const errorMsg = document.getElementById('auth-error');

    try {
        if (isRegistering) {
            // Registro
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            // Guardar nombre en perfil (simulado guardando en colección usuarios)
            await setDoc(doc(db, "users", userCredential.user.uid), {
                name: name,
                email: email,
                role: "docente"
            });
            alert("Usuario creado con éxito");
        } else {
            // Login
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (error) {
        errorMsg.innerText = error.message;
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('selection-section').style.display = 'block';
        document.getElementById('display-name').innerText = user.email; // Idealmente buscar el nombre en DB
    } else {
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('selection-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'none';
    }
});

window.logout = () => signOut(auth);

// --- NAVEGACIÓN ---
window.enterLab = (labName) => {
    currentLab = labName;
    document.getElementById('selection-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('current-lab-title').innerText = labName;
    loadSchedule();
    loadNotifications();
};

window.goBack = () => {
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('selection-section').style.display = 'block';
};

// --- LÓGICA DEL HORARIO (CORE) ---

// Escuchar cambios en tiempo real en la colección "horarios" -> documento "labName" -> subcolección "slots"
function loadSchedule() {
    const tableBody = document.getElementById('schedule-body');
    
    // Referencia a los slots de este laboratorio específico
    // Estructura DB: labs/{labName}/slots/{hora}
    const q = query(collection(db, "labs", currentLab, "slots"), orderBy("timeIndex"));

    onSnapshot(q, (snapshot) => {
        tableBody.innerHTML = ""; // Limpiar tabla
        
        if (snapshot.empty) {
            // Si no hay datos, inicializamos algunas horas por defecto (solo la primera vez)
            initDefaultSlots(); 
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const row = document.createElement('tr');
            
            // Asignar clase de color según estado
            let statusClass = 'row-free';
            let statusText = 'Desocupado';
            if (data.status === 'reserved') { statusClass = 'row-reserved'; statusText = 'Reservado'; }
            if (data.status === 'occupied') { statusClass = 'row-occupied'; statusText = 'Ocupado'; }

            row.className = statusClass;
            row.innerHTML = `
                <td>${data.time}</td>
                <td><strong>${statusText}</strong></td>
                <td>
                    ${data.materia ? `<b>${data.materia}</b><br>` : ''}
                    ${data.comment || ''} 
                    ${data.teacher ? `<br><small><i>Prof: ${data.teacher}</i></small>` : ''}
                </td>
                <td>
                    <button onclick="openEditModal('${doc.id}', '${data.time}')" style="background:none; border:1px solid #333;">✎ Editar</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    });
}

// Crear horas por defecto si el lab es nuevo
async function initDefaultSlots() {
    const defaultHours = ["07:00 - 08:00", "08:00 - 09:00", "09:00 - 10:00"];
    const colRef = collection(db, "labs", currentLab, "slots");
    
    for (let i = 0; i < defaultHours.length; i++) {
        await addDoc(colRef, {
            time: defaultHours[i],
            timeIndex: i,
            status: 'free',
            comment: '',
            materia: '',
            teacher: ''
        });
    }
}

// Añadir nueva fila de hora (dinámico)
window.addHourRow = async () => {
    const timePrompt = prompt("Ingrese el intervalo de hora (Ej: 13:00 - 14:00):");
    if (timePrompt) {
        await addDoc(collection(db, "labs", currentLab, "slots"), {
            time: timePrompt,
            timeIndex: Date.now(), // Usar timestamp para ordenar
            status: 'free',
            comment: '',
            materia: '',
            teacher: ''
        });
    }
};

// --- MODAL Y EDICIÓN ---
window.openEditModal = (id, time) => {
    currentSlotId = id;
    document.getElementById('modal-time').innerText = time;
    document.getElementById('modal-edit').classList.remove('hidden-modal');
    // Resetear campos
    document.getElementById('modal-status').value = 'free';
    document.getElementById('modal-comment').value = '';
    document.getElementById('modal-materia').value = '';
    toggleCommentField();
};

window.closeModal = () => {
    document.getElementById('modal-edit').classList.add('hidden-modal');
};

window.toggleCommentField = () => {
    const status = document.getElementById('modal-status').value;
    const section = document.getElementById('comment-section');
    if (status === 'free') {
        section.classList.add('hidden');
    } else {
        section.classList.remove('hidden');
    }
};

window.saveSlot = async () => {
    const status = document.getElementById('modal-status').value;
    const comment = document.getElementById('modal-comment').value;
    const materia = document.getElementById('modal-materia').value;
    
    const updateData = {
        status: status,
        teacher: status === 'free' ? '' : currentUser.email, // Guardar quien reservó
        comment: status === 'free' ? '' : comment,
        materia: status === 'free' ? '' : materia
    };

    // Actualizar horario
    const slotRef = doc(db, "labs", currentLab, "slots", currentSlotId);
    await updateDoc(slotRef, updateData);

    // Crear notificación
    await addDoc(collection(db, "notifications"), {
        msg: `El ${currentLab} pasó a estado ${status.toUpperCase()} por ${currentUser.email}`,
        timestamp: new Date()
    });

    closeModal();
};

// --- NOTIFICACIONES Y REPORTES ---
function loadNotifications() {
    const list = document.getElementById('notification-list');
    const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"), limit(10));

    onSnapshot(q, (snapshot) => {
        list.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const li = document.createElement('li');
            li.innerText = `📢 ${data.msg}`;
            list.appendChild(li);
        });
    });
}

window.sendReport = async () => {
    const text = document.getElementById('report-text').value;
    if (!text) return;
    
    await addDoc(collection(db, "notifications"), {
        msg: `⚠️ ERROR REPORTADO en ${currentLab}: ${text}`,
        timestamp: new Date()
    });
    
    document.getElementById('report-text').value = "";
    alert("Reporte enviado al sistema.");
};

// --- FILTROS ---
window.filterTable = () => {
    const input = document.getElementById('filter-input').value.toLowerCase();
    const rows = document.getElementById('schedule-body').getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const textContent = rows[i].textContent.toLowerCase();
        if (textContent.indexOf(input) > -1) {
            rows[i].style.display = "";
        } else {
            rows[i].style.display = "none";
        }
    }
};