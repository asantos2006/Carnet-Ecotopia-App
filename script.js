// Importamos la función para encender Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// Importamos la herramienta de Autenticación (para el Login/Registro)
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// Importamos la Base de Datos (Firestore)
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment, collection, getDocs, arrayUnion} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAjNKLoObyyl6Q0uQN4MOBdWz8MFhsCxks",
  authDomain: "carnet-ecotopia.firebaseapp.com",
  projectId: "carnet-ecotopia",
  storageBucket: "carnet-ecotopia.firebasestorage.app",
  messagingSenderId: "832532632498",
  appId: "1:832532632498:web:ea01bebd25ee40951fcaab",
  measurementId: "G-LHSCNYELGH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Creamos las variables constantes para usar la Autenticación y la Base de Datos
const auth = getAuth(app);
const db = getFirestore(app);

console.log("¡Firebase conectado correctamente!");
const CORREO_ADMIN = "ecotopia.asociacion@gmail.com";

// FUNCiÓN PARA REGISTRAR USUARIO


window.registrarUsuario = async function(event) {
    event.preventDefault();

    // 1. Capturamos los datos de las cajas
    let valorNombre = document.getElementById('nombre').value;
    let valorEmail = document.getElementById('email').value;
    let valorPassword = document.getElementById('password').value;

    // Usamos try/catch. "Intenta (try) hacer esto, y si Firebase da un error, captúralo (catch)"
    try {
        console.log("Contactando con Google Firebase...");

        // 2. Crear el usuario en la Caja Fuerte (Autenticación)
        // Le decimos "espera (await)" a que se cree la cuenta antes de seguir
        const credenciales = await createUserWithEmailAndPassword(auth, valorEmail, valorPassword);
        const usuarioFirebase = credenciales.user;

        console.log("¡Cuenta creada! Creando su carné en la base de datos...");

        // 3. Crear su "Carné" en la Base de Datos (Firestore)
        // doc(db, "usuarios", usuarioFirebase.uid) significa: En la Base de Datos (db), 
        // crea una carpeta "usuarios", y crea un archivo con el ID único de este usuario.
        await setDoc(doc(db, "usuarios", usuarioFirebase.uid), {
            nombre: valorNombre,
            email: valorEmail,
            puntosTotales: 0,
            fechaRegistro: new Date()
        });

        // 4. Si todo ha ido bien, avisamos y redirigimos
        alert("¡Registro exitoso, " + valorNombre + "! Entrando a tu carné...");
        window.location.href = "principal.html";
        } catch (error) {
        console.error("Error de Firebase:", error.code);
        
        // Ahora Firebase te dirá exactamente qué falla
        if (error.code === 'auth/email-already-in-use') {
            alert("Este correo ya está registrado. Por favor, ve a 'Iniciar Sesión' o usa otro correo.");
        } else if (error.code === 'auth/weak-password') {
            alert("La contraseña es muy corta. Debe tener al menos 6 caracteres.");
        } else if (error.code === 'auth/invalid-email') {
            alert("El formato del correo electrónico no es válido.");
        } else {
            alert("Ups, hubo un error: " + error.message);
        }
    }
}



// FUNCIÓN PARA INICIAR SESIÓN Y CERRAR Y ADMIN

window.iniciarSesion = async function(event) {
    if (event) event.preventDefault();
    let email = document.getElementById('email-login').value;
    let pass = document.getElementById('password-login').value;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        // ¡No ponemos redirección aquí! El Guardián Único se encargará.
    } catch (error) {
        alert("Correo o contraseña incorrectos");
    }
}

window.accesoAdmin = async function(event) {
    if (event) event.preventDefault();
    let email = document.getElementById('email-login').value;
    let pass = document.getElementById('password-login').value;

    if (!email || !pass) {
        return alert("Para entrar como administrador, escribe tu correo y contraseña y pulsa este botón.");
    }

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        // El Guardián Único detectará que eres tú y te abrirá la puerta.
    } catch (error) {
        alert("Credenciales incorrectas.");
    }
}

window.cerrarSesion = async function() {
    try {
        await signOut(auth); // 1. Avisamos a Firebase
        console.log("Sesión cerrada en Firebase");
        
        // 2. Limpiamos manualmente el almacenamiento local por si acaso
        localStorage.clear();
        sessionStorage.clear();

        // 3. Redirigimos al login (que ahora es index.html)
        window.location.href = "index.html"; 
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        window.location.href = "index.html";
    }
}



// FUNCIÓN DATOS DEL CARNET


// 1. Definimos la función para cargar datos del usuario
window.cargarDatosPerfil = async function(user) {
    const userRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        const datos = docSnap.data();
        
        // 1. Nombre y Puntos (Usando las llaves exactas de tu captura)
        document.getElementById('nombre-usuario').innerText = datos.nombre || "Usuario"; 
        const pts = datos.puntosTotales || 0;
        document.getElementById('porcentaje-texto').innerText = pts + "%";

        // 2. Historial de Actividades[cite: 1, 2]
        const contenedorActividades = document.getElementById('lista-actividades-usuario');
        if (contenedorActividades) {
            if (datos.historial && datos.historial.length > 0) {
                contenedorActividades.innerHTML = ""; // Borramos el mensaje de "Aún no has participado"[cite: 1]
                
                // Invertimos para ver lo más reciente arriba
                const historialInvertido = [...datos.historial].reverse();
                historialInvertido.forEach(actividad => {
                    contenedorActividades.innerHTML += `
                        <div class="item-actividad" style="display: flex; justify-content: space-between; margin-bottom: 8px; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
                            <span>🌿 ${actividad.nombre}</span> 
                            <span style="color: #62c566; font-weight: bold;">+${actividad.puntos}</span>
                        </div>
                    `;
                });
            }
        }
        
        // 3. Generar Código QR[cite: 1, 2]
        const contenedorQR = document.getElementById("qrcode");
        if (contenedorQR) {
            contenedorQR.innerHTML = ""; 
            new QRCode(contenedorQR, {
                text: user.uid,
                width: 128,
                height: 128,
                colorDark : "#000000",
                colorLight : "#ffffff"
            });
        }
    }
};

// --- FUNCIONES DE ADMINISTRADOR ---

// 1. Crear un evento en la base de datos
window.crearEvento = async function() {
    const nombreVal = document.getElementById('nombre-evento').value.trim();
    const puntosVal = parseInt(document.getElementById('puntos-evento').value);

    if (!nombreVal || isNaN(puntosVal)) return alert("Rellena nombre y puntos");

    try {
        const nuevoEventoRef = doc(collection(db, "eventos"));
        await setDoc(nuevoEventoRef, {
            nombre: nombreVal, // En español
            puntosRecompensa: puntosVal, // En español
            date: new Date()
        });
        alert("Evento creado con éxito");
        document.getElementById('nombre-evento').value = "";
        document.getElementById('puntos-evento').value = "";
        cargarPanelAdminCompleto(); 
    } catch (e) { console.error(e); }
}

// 2. Cargar y mostrar la lista de todos los usuarios (VERSIÓN VISUAL MEJORADA)
window.mostrarUsuariosAdmin = async function() {
    const contenedor = document.getElementById('lista-usuarios');
    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        contenedor.innerHTML = ""; // Limpiamos el "Cargando..."

        querySnapshot.forEach((usuarioDoc) => {
            const datos = usuarioDoc.data();
            
            // Si el usuario no tiene nombre o puntos, ponemos un valor por defecto
            const nombreUsuario = datos.nombre || "Estudiante";
            const puntosTotales = datos.puntosTotales || 0;

            // Creamos la fila alineada. El botón ahora es una "etiqueta" visual.
            contenedor.innerHTML += `
                <div class="fila-usuario" style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: white; font-size: 0.9em;"><strong>${nombreUsuario}</strong></span>
                    <span class="btn-puntos" style="cursor: default; pointer-events: none; font-size: 0.8em; padding: 5px 12px;">
                        ${puntosTotales} pts
                    </span>
                </div>
            `;
        });
    } catch (e) { 
        contenedor.innerHTML = "<p style='color: red;'>Error al cargar usuarios.</p>";
        console.error("Error al mostrar usuarios:", e); 
    }
}

// GESTIÓN DE EVENTOS Y ASISTENCIA


window.cargarPanelAdminCompleto = async function() {
    const contenedorEventos = document.getElementById('lista-eventos-admin');
    if (!contenedorEventos) return;

    try {
        // Obtenemos los usuarios para el desplegable
        const snapshotUsuarios = await getDocs(collection(db, "usuarios"));
        let opcionesUsuarios = `<option value="">Selecciona un estudiante...</option>`;
        snapshotUsuarios.forEach(u => {
            const data = u.data();
            opcionesUsuarios += `<option value="${u.id}">${data.nombre}</option>`;
        });

        // Obtenemos los eventos de la colección "eventos"
        const snapshotEventos = await getDocs(collection(db, "eventos"));
        contenedorEventos.innerHTML = ""; 

        snapshotEventos.forEach((docEvento) => {
            const evento = docEvento.data();
            const idEvento = docEvento.id;

            // USAMOS LOS NOMBRES DE TU CAPTURA
            const nombreEvento = evento.nombre || "Evento sin nombre"; 
            const puntosEvento = evento.puntosRecompensa || 0; 

            const divEvento = document.createElement('div');
            divEvento.className = 'fila-usuario'; 
            divEvento.innerHTML = `
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: #62c566;">${nombreEvento}</strong>
                        <span style="background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 10px; font-size: 0.7em; color: white;">
                            ${puntosEvento} pts
                        </span>
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 5px;">
                        <select id="select-${idEvento}" class="input-estilo" style="padding: 5px; font-size: 0.8em; flex: 1;">
                            ${opcionesUsuarios}
                        </select>
                        <button class="btn-puntos" onclick="registrarAsistencia('${idEvento}', '${nombreEvento}', ${puntosEvento})">
                            Fichar
                        </button>
                    </div>
                </div>
            `;
            contenedorEventos.appendChild(divEvento);
        });
    } catch (e) {
        console.error("Error al cargar panel:", e);
    }
}

// Función para registrar que ALGUIEN hizo UN EVENTO
window.registrarAsistencia = async function(idEvento, nombreEvento, puntosASumar) {
    const select = document.getElementById(`select-${idEvento}`);
    const idUsuario = select.value;

    if (!idUsuario) return alert("Selecciona un estudiante");

    try {
        const userRef = doc(db, "usuarios", idUsuario);
        await updateDoc(userRef, {
            puntosTotales: increment(puntosASumar), // Llave en español[cite: 2]
            historial: arrayUnion({ // Llave en español[cite: 2]
                nombre: nombreEvento, 
                puntos: puntosASumar, 
                fecha: new Date()
            })
        });
        cargarPanelAdminCompleto();
    } catch (e) { 
        console.error("Error al registrar:", e); 
    }
}

// LECTOR DE QR DEL ADMIN

window.encenderCamara = function() {
    document.getElementById('reader').style.display = 'block';
    const html5QrCode = new Html5Qrcode("reader");
    
    html5QrCode.start(
        { facingMode: "environment" }, // Usa la cámara trasera
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            // Buscamos todos los select de los eventos y les ponemos este ID
            const todosLosSelects = document.querySelectorAll('select[id^="select-"]');
            todosLosSelects.forEach(select => {
                select.value = decodedText;
            });

            html5QrCode.stop(); // Apagamos la cámara
            document.getElementById('reader').style.display = 'none';
        }
    ).catch(err => console.error("Error de cámara:", err));
}

// RECARGA DE DATOS MANUEAL EN VENTANA USUARIO

window.recargarDatosManual = function() {
    const user = auth.currentUser; // Miramos quién es el usuario actual
    
    if (user) {
        // Mostramos un pequeño aviso visual o cambiamos el texto del botón
        console.log("Actualizando datos desde Firebase...");
        
        // Llamamos a la función que ya teníamos para pintar todo de nuevo[cite: 2]
        window.cargarDatosPerfil(user); 
        
        // Opcional: Un alert pequeño o un toast si quieres confirmar al usuario
        // alert("¡Datos actualizados!"); 
    } else {
        window.location.href = "index.html"; // Si no hay usuario, al login (nuevo index)[cite: 2]
    }
}


// SEGURIDAD PARA ENTRAR EN ADMIN
onAuthStateChanged(auth, async (user) => {
    const rutaPagina = window.location.pathname;

    if (user) {
        // --- CASO 1: ESTÁ EN LA PÁGINA ADMIN ---
        if (rutaPagina.includes("admin.html")) {
            if (user.email === CORREO_ADMIN) {
                cargarPanelAdminCompleto();
                mostrarUsuariosAdmin();
            } else {
                alert("Acceso denegado. Zona exclusiva para administradores.");
                window.location.href = "principal.html"; 
            }
        } 
        // --- CASO 2: ESTÁ EN EL CARNÉ ---
        else if (rutaPagina.includes("principal.html")) {
            cargarDatosPerfil(user);
        } 
        // --- CASO 3: ESTÁ EN EL LOGIN O REGISTRO PERO YA TIENE SESIÓN ---
        else if (rutaPagina.includes("index.html") || rutaPagina.includes("registro.html")) {
            
            // LA CORRECCIÓN ESTÁ AQUÍ 👇
            // Si acaba de registrarse, le decimos al Guardián que NO lo redirija.
            // Dejamos que la función 'registrarUsuario' termine de guardar los datos en la nube.
            if (rutaPagina.includes("registro.html")) {
                return; // Esto "apaga" al guardián momentáneamente
            }

            // Si está en el login (index.html), sí lo redirigimos con normalidad
            if (user.email === CORREO_ADMIN) {
                window.location.href = "admin.html"; 
            } else {
                window.location.href = "principal.html"; 
            }
        }
    } else {
        // --- SI NO HAY NADIE LOGUEADO ---
        const estaEnLogin = rutaPagina.includes("index.html") || rutaPagina.includes("registro.html");
        
        if (!estaEnLogin) {
            window.location.href = "index.html";
        }
    }
});