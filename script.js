// Importamos la función para encender Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// Importamos la herramienta de Autenticación (para el Login/Registro)
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// Importamos la Base de Datos (Firestore)
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment, collection, getDocs,deleteDoc, arrayUnion} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";


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

// FUNCiÓN PARA REGISTRAR USUARIO, INICIAR SESIÓN Y CERRAR SESIÓN
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

// 1. recarga datos del perfil (llama a cada función)
window.cargarDatosPerfil = async function(user) {
    if (!user) return;

    try {
        const userRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            const datos = docSnap.data();
            
            // Pintamos el nombre
            document.getElementById('nombre-usuario').innerText = datos.nombre || "Usuario"; 
            
            // Delegamos cada tarea a su especialista:
            actualizarProgresoUI(datos);
            actualizarHistorialUI(datos.historial || []);
            generarCodigoQR(user.uid); 
        }
    } catch (error) {
        console.error("Error al cargar el perfil:", error);
    }
};

// 2. Actualizador de Objetivo y Barra de progreso
window.actualizarProgresoUI = function(datos) {
    const puntosTotales = datos.puntosTotales || 0;
    const metaPersonal = datos.metaPuntos || 0; // Extraemos la meta real (0 si no tiene)

    const elementoTextoMeta = document.getElementById("texto-meta");
    const elementoPorcentaje = document.getElementById('porcentaje-texto');
    const anilloProgreso = document.getElementById("anillo-progreso");

    if (metaPersonal === 0) {
        // CASO A: NO TIENE OBJETIVOS MARCADOS
        if (elementoTextoMeta) elementoTextoMeta.innerText = "¡Márcate un objetivo de EcoPoints!";
        if (elementoPorcentaje) elementoPorcentaje.innerText = "0%";
        if (anilloProgreso) anilloProgreso.style.background = `conic-gradient(rgba(255,255,255,0.2) 100%, transparent 0)`; 
        // El anillo se queda en modo "gris/vacío"
    } else {
        // CASO B: SÍ TIENE OBJETIVOS (Hacemos matemáticas)
        if (elementoTextoMeta) elementoTextoMeta.innerText = `Vamos a por esos ${metaPersonal} ecopoints`;
        
        let porcentaje = (puntosTotales / metaPersonal) * 100;
        if (porcentaje > 100) porcentaje = 100; 

        if (elementoPorcentaje) elementoPorcentaje.innerText = `${Math.floor(porcentaje)}%`;
        if (anilloProgreso) {
            anilloProgreso.style.background = `conic-gradient(#62c566 ${porcentaje}%, rgba(255,255,255,0.2) ${porcentaje}%)`;
        }
    }
};

// 3. Actualizador de eventos (Historial en firebase)
window.actualizarHistorialUI = function(historial) {
    const contenedorActividades = document.getElementById('lista-actividades-usuario');
    if (!contenedorActividades) return;

    if (historial.length === 0) {
        contenedorActividades.innerHTML = `<p id="mensaje-vacio" style="font-size: 0.8em; color: rgba(255,255,255,0.5);">Aún no has participado en eventos.</p>`;
        return;
    }

    contenedorActividades.innerHTML = ""; // Limpiamos
    const historialInvertido = [...historial].reverse();
    
    historialInvertido.forEach(actividad => {
        contenedorActividades.innerHTML += `
            <div class="item-actividad" style="display: flex; justify-content: space-between; margin-bottom: 8px; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
                <span>🌿 ${actividad.nombre}</span> 
                <span style="color: #62c566; font-weight: bold;">+${actividad.puntos}</span>
            </div>
        `;
    });
};

// 4. DibujaQR
let qrYaGenerado = false; // Esta bandera (candado) evita que el QR parpadee al recargar
window.generarCodigoQR = function(uid) {
    if (qrYaGenerado) return; // Si ya lo dibujó en esta sesión, no hace nada
    
    const contenedorQR = document.getElementById("qrcode");
    if (contenedorQR) {
        contenedorQR.innerHTML = ""; 
        new QRCode(contenedorQR, {
            text: uid,
            width: 128,
            height: 128,
            colorDark : "#000000",
            colorLight : "#ffffff"
        });
        qrYaGenerado = true; // Echamos la cerradura
    }
};

// FUNCIONES DE ADMINISTRADOR

// 1. Crear un evento 
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
// 2. Cargar y mostrar la lista de todos los usuarios
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
            // Creamos la fila alineada. Ahora añadimos el botón "ℹ️"
            contenedor.innerHTML += `
                <div class="fila-usuario" style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: white; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                        <strong>${nombreUsuario}</strong>
                    </span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="btn-puntos" style="cursor: default; pointer-events: none; font-size: 0.8em; padding: 5px 12px;">
                            ${puntosTotales} pts
                        </span>
                        <!-- NUEVO BOTÓN INFO -->
                        <button class="btn-puntos" onclick="abrirModalUsuario('${usuarioDoc.id}')" style="background: transparent; border: 1px solid #62c566; padding: 4px 8px; font-size: 1em;">
                            ℹ️
                        </button>
                    </div>
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
            // SUSTITUYE EL divEvento.innerHTML POR ESTO:
            divEvento.innerHTML = `
                <div style="width: 100%;">
                    
                    <!-- FILA SUPERIOR: Nombre, Botones y Puntos -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        
                        <strong style="color: #62c566; font-size: 0.95em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; padding-right: 10px;">
                            ${nombreEvento}
                        </strong>
                        
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <!-- NUEVO Botón de borrar (Papelera roja) -->
                            <button class="btn-puntos" onclick="borrarEvento('${idEvento}', '${nombreEvento}')" style="background: transparent; border: 1px solid #ff4d4d; padding: 4px 8px; font-size: 1.1em; color: #ff4d4d;">
                                🗑️
                            </button>
                            <!-- Botón de cámara -->
                            <button class="btn-puntos" onclick="abrirCamaraModal('${idEvento}', '${nombreEvento}', ${puntosEvento})" style="background: transparent; border: 1px solid #62c566; padding: 4px 8px; font-size: 1.1em;">
                                📷
                            </button>
                            <!-- Etiqueta de puntos -->
                            <span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 10px; font-size: 0.7em; color: white; white-space: nowrap;">
                                ${puntosEvento} pts
                            </span>
                        </div>

                    </div>

                    <!-- FILA INFERIOR: Desplegable y Fichar manual -->
                    <div style="display: flex; gap: 5px; width: 100%;">
                        
                        <select id="select-${idEvento}" class="input-estilo" style="padding: 6px; font-size: 0.8em; flex: 1; min-width: 0; text-overflow: ellipsis;">
                            ${opcionesUsuarios}
                        </select>
                        
                        <button class="btn-puntos" onclick="registrarAsistenciaManual('${idEvento}', '${nombreEvento}', ${puntosEvento})" style="padding: 6px 12px; white-space: nowrap;">
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

// Registrar Asistencia

window.procesarFichaje = async function(idUsuario, nombreEvento, puntosASumar) {
    if (!idUsuario) {
        return { exito: false, tipo: "vacio", mensaje: "No se ha seleccionado ningún estudiante." };
    }

    try {
        const userRef = doc(db, "usuarios", idUsuario);
        
        // 1. Leemos el historial
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            const datosUsuario = docSnap.data();
            const historial = datosUsuario.historial || [];
            
            // 2. Comprobamos duplicados
            const yaLoTiene = historial.some(act => act.nombre === nombreEvento);
            
            if (yaLoTiene) {
                // Devolvemos un informe de error por duplicado
                return { exito: false, tipo: "duplicado", mensaje: "Este alumno ya tenía este evento registrado." };
            }
        }

        // 3. Guardamos los datos
        await updateDoc(userRef, {
            puntosTotales: increment(puntosASumar), 
            historial: arrayUnion({ 
                nombre: nombreEvento, 
                puntos: puntosASumar, 
                fecha: new Date() 
            })
        });
        
        // 4. Devolvemos un informe de éxito
        return { exito: true, tipo: "ok", mensaje: `¡+${puntosASumar} pts añadidos correctamente!` };
        
    } catch (e) { 
        console.error("Error en la base de datos:", e); 
        return { exito: false, tipo: "error", mensaje: "Error de conexión con la base de datos." };
    }
}
    // Enchufe 1: Botón Manual
window.registrarAsistenciaManual = async function(idEvento, nombreEvento, puntosASumar) {
    const idUsuario = document.getElementById(`select-${idEvento}`).value;
    
    // 1. Pedimos al motor que haga el trabajo y ESPERAMOS (await) su informe
    const resultado = await procesarFichaje(idUsuario, nombreEvento, puntosASumar);
    
    // 2. Actuamos según el informe (Usando Alerts)
    if (resultado.exito) {
        alert(`✅ ${resultado.mensaje}`);
        cargarPanelAdminCompleto(); // Recargamos UI solo si hay éxito
        mostrarUsuariosAdmin();
    } else if (resultado.tipo === "duplicado") {
        alert(`¡Cuidado! El estudiante ya tiene registrado el evento "${nombreEvento}".`);
    } else {
        alert(`❌ ${resultado.mensaje}`);
    }
}
    // Enchufe 2: Cámara QR
window.registrarAsistenciaQR = async function(idUsuarioEscaneado, evento) {
    // 1. Pedimos al motor que haga el trabajo y ESPERAMOS (await) su informe
    const resultado = await procesarFichaje(idUsuarioEscaneado, evento.nombreEvento, evento.puntosEvento);
    
    const toast = document.getElementById('toast-notificacion');

    // 2. Actuamos según el informe (Usando Toasts de colores)
    if (resultado.exito) {
        toast.style.backgroundColor = "#62c566"; // Verde
        toast.style.color = "#0d1a0e";
        mostrarToastNotificacion(`✅ ${resultado.mensaje}`);
        
        cargarPanelAdminCompleto(); // Recargamos UI solo si hay éxito
        mostrarUsuariosAdmin();
    } else if (resultado.tipo === "duplicado") {
        toast.style.backgroundColor = "#ffcc00"; // Amarillo
        toast.style.color = "#000";
        mostrarToastNotificacion(`⚠️ ${resultado.mensaje}`);
    } else {
        toast.style.backgroundColor = "#ff4d4d"; // Rojo
        toast.style.color = "white";
        mostrarToastNotificacion(`❌ ${resultado.mensaje}`);
    }
}

// Eliminar Asistencia

// Función "ciega": Solo quita un evento de la mochila de un usuario y resta los puntos
window.procesarBorradoFichaje = async function(idUsuario, nombreEvento) {
    try {
        const userRef = doc(db, "usuarios", idUsuario);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) return { exito: false, mensaje: "Usuario no encontrado" };

        const datosUsuario = docSnap.data();
        const historialActual = datosUsuario.historial || [];

        // 1. Verificamos si realmente lo tiene
        const tieneElEvento = historialActual.some(act => act.nombre === nombreEvento);
        if (!tieneElEvento) {
            return { exito: false, mensaje: "El usuario no tiene este evento en su historial" };
        }

        // 2. Extraemos los puntos que valía para restarlos correctamente
        const eventoData = historialActual.find(act => act.nombre === nombreEvento);
        const puntosARestar = eventoData.puntos;

        // 3. Filtramos el historial para quitar ese evento concreto
        const nuevoHistorial = historialActual.filter(act => act.nombre !== nombreEvento);

        // 4. Guardamos en Firebase el historial limpio y restamos los puntos
        await updateDoc(userRef, {
            historial: nuevoHistorial,
            puntosTotales: increment(-puntosARestar)
        });

        return { exito: true, mensaje: `Evento "${nombreEvento}" borrado. -${puntosARestar} pts.` };

    } catch (error) {
        console.error("Error en el motor de borrado:", error);
        return { exito: false, mensaje: "Error de conexión con la base de datos." };
    }
}
    // Enchufe 1: Borrado Manual Evento de Usuario
window.borrarFichajeManual = async function(idUsuario, nombreEvento) {
    // 1. Pedimos confirmación al administrador
    const confirmacion = confirm(`¿Seguro que quieres quitar el evento "${nombreEvento}" de este estudiante?\n\nSe le restarán los puntos automáticamente.`);
    if (!confirmacion) return;

    // 2. Llamamos al motor y esperamos
    const resultado = await procesarBorradoFichaje(idUsuario, nombreEvento);

    // 3. Actuamos según el informe
    if (resultado.exito) {
        alert(`✅ ${resultado.mensaje}`);
        abrirModalUsuario(idUsuario); // Recargamos la ficha para que desaparezca la fila
        mostrarUsuariosAdmin();       // Recargamos la lista del fondo para actualizar los puntos
    } else {
        alert(`❌ ${resultado.mensaje}`);
    }
}
    // Enchufe 2: Borrado En cascada
window.borrarEvento = async function(idEvento, nombreEvento) {
    const confirmacion = confirm(`¿Estás seguro de que quieres eliminar el evento "${nombreEvento}"?\n\n⚠️ IMPORTANTE: Esta acción también eliminará el evento del historial de TODOS los estudiantes que hayan participado y les restará los puntos.`);
    
    if (confirmacion) {
        try {
            // PASO A: Borramos el evento de la colección principal "eventos"
            await deleteDoc(doc(db, "eventos", idEvento));
            
            // PASO B: Buscamos a todos los usuarios para limpiarlos
            const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
            const promesasDeBorrado = []; // Lista de tareas para el motor

            usuariosSnapshot.forEach((usuarioDoc) => {
                const datosUsuario = usuarioDoc.data();
                const historial = datosUsuario.historial || [];

                // Si este alumno tiene el evento, le encargamos la tarea a nuestro Motor Central
                if (historial.some(act => act.nombre === nombreEvento)) {
                    promesasDeBorrado.push(procesarBorradoFichaje(usuarioDoc.id, nombreEvento));
                }
            });

            // Le decimos al navegador: "Ejecuta todos los motores a la vez y avísame cuando acaben"
            await Promise.all(promesasDeBorrado);
            
            // Avisamos y recargamos el panel
            alert("✅ Evento borrado por completo. Se han actualizado los historiales de los estudiantes.");
            cargarPanelAdminCompleto(); 
            mostrarUsuariosAdmin(); 

        } catch (error) {
            console.error("Error al borrar evento en cascada:", error);
            alert("❌ Hubo un problema al borrar el evento.");
        }
    }
}
// LECTOR DE QR DEL ADMIN
let escanerModalActivo = null;
let eventoEscaneandoActual = null; // Guardará qué evento estamos cobrando
let qrProcesando = false; // La "Cerradura" para evitar escaneos dobles por accidente

window.abrirCamaraModal = function(idEvento, nombreEvento, puntosEvento) {
    // 1. Guardamos los datos del evento que se ha pulsado
    eventoEscaneandoActual = { idEvento, nombreEvento, puntosEvento };
    
    // 2. Cambiamos el título para que el profe sepa qué está cobrando
    document.getElementById('titulo-modal-escaner').innerText = `Escaneando para:\n${nombreEvento}`;
    
    // 3. Mostramos la cabina oscura
    document.getElementById('modal-escaner').style.display = 'flex';

    // 4. Encendemos la cámara
    escanerModalActivo = new Html5Qrcode("reader");
    escanerModalActivo.start(
        { facingMode: "environment" },
        { fps: 5, qrbox: { width: 250, height: 250 } }, 
        (decodedText) => {
            // SI DETECTA UN CÓDIGO QR:
            
            if (qrProcesando) return; // Si la cerradura está echada, ignoramos este frame
            qrProcesando = true; // Echamos la cerradura
            
            // Mandamos los puntos a la base de datos de forma silenciosa (decodedText es el ID del alumno)
            registrarAsistenciaQR(decodedText, eventoEscaneandoActual);
            
            // Mantenemos la cerradura echada 2.5 segundos para que te dé tiempo a quitar el carné
            setTimeout(() => { 
                qrProcesando = false; 
            }, 2500); 
        }
    ).catch(err => {
        console.error("Error de cámara:", err);
        alert("No se pudo encender la cámara.");
        cerrarCamaraModal();
    });
}

window.cerrarCamaraModal = function() {
    if (escanerModalActivo) {
        escanerModalActivo.stop().then(() => {
            escanerModalActivo.clear();
            escanerModalActivo = null;
        }).catch(err => console.error("Error al detener:", err));
    }
    // Ocultamos la cabina
    document.getElementById('modal-escaner').style.display = 'none';
    eventoEscaneandoActual = null;
}

window.mostrarToastNotificacion = function(mensaje) {
    const toast = document.getElementById('toast-notificacion');
    toast.innerText = mensaje;
    toast.classList.add('toast-visible'); // La clase que lo hace flotar hacia arriba
    
    // Lo ocultamos automáticamente a los 3 segundos
    setTimeout(() => {
        toast.classList.remove('toast-visible');
    }, 3000); 
}

// RECARGA DE DATOS MANUEAL EN VENTANA USUARIO

window.recargarDatosManual = function() {
    const user = auth.currentUser;
    if (user) {
        // Limpiamos la bandera del QR para que pueda refrescarse si es necesario
        qrYaGenerado = false; 
        cargarDatosPerfil(user); 
    } else {
        window.location.href = "index.html";
    }
}

// DATOS DEL USUARIO

window.abrirModalUsuario = async function(idUsuario) {
    try {
        // 1. Buscamos el documento exacto del usuario
        const userRef = doc(db, "usuarios", idUsuario);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            const datos = docSnap.data();
            
            // 2. Rellenamos la cabecera
            document.getElementById('info-nombre').innerText = datos.nombre || "Estudiante";
            document.getElementById('info-email').innerText = datos.email || "Sin correo asociado";
            
            // Extraemos la fecha de registro (Si es un Timestamp puro de Firebase, lo pasamos a texto legible)
            let fechaTexto = "Fecha desconocida (Usuario antiguo)";
            if (datos.fechaRegistro) {
                const fechaDate = datos.fechaRegistro.toDate ? datos.fechaRegistro.toDate() : new Date(datos.fechaRegistro);
                fechaTexto = fechaDate.toLocaleDateString() + " a las " + fechaDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
            document.getElementById('info-fecha').innerText = `Registrado el: ${fechaTexto}`;

            // 3. Rellenamos la tabla del historial
            const tbody = document.getElementById('info-tabla-historial');
            tbody.innerHTML = ""; // Limpiamos la tabla
            const historial = datos.historial || [];

            if (historial.length === 0) {
                tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 15px; color: rgba(255,255,255,0.4); font-style: italic;">Aún no ha participado en actividades</td></tr>`;
            } else {
                // Invertimos para que los últimos eventos salgan los primeros
                const historialInvertido = [...historial].reverse(); 
                historialInvertido.forEach(act => {
                    tbody.innerHTML += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <td style="padding: 8px 0; color: #c4c4c4;">🌿 ${act.nombre}</td>
                            <td style="text-align: right; padding: 8px 0; color: #a4f5a7; font-weight: bold; display: flex; justify-content: flex-end; align-items: center; gap: 10px;">
                                +${act.puntos}
                                <!-- NUEVO BOTÓN DE PAPELERA INDIVIDUAL -->
                                <button onclick="borrarFichajeManual('${idUsuario}', '${act.nombre}')" style="background: transparent; border: none; color: #ff4d4d; cursor: pointer; font-size: 1.1em;" title="Borrar este fichaje">
                                    🗑️
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }

            // 4. Rellenamos el total
            document.getElementById('info-total-puntos').innerText = `${datos.puntosTotales || 0} pts`;

            // 5. Mostramos la ventana
            document.getElementById('modal-info-usuario').style.display = 'flex';
        }
    } catch (error) {
        console.error("Error al cargar info del usuario:", error);
        alert("Hubo un error al extraer la ficha del estudiante.");
    }
}

window.cerrarModalUsuario = function() {
    document.getElementById('modal-info-usuario').style.display = 'none';
}

// SISTEMA DE OBJETIVOS DEL USUARIO

// Variable global para recordar qué usuario está conectado ahora mismo
let usuarioConectadoActual = null; 

window.abrirModalObjetivos = async function() {
    // Necesitamos saber qué usuario es. Firebase Auth nos lo dice:
    const user = auth.currentUser;
    if (!user) return alert("Debes iniciar sesión primero");
    
    usuarioConectadoActual = user.uid; // Guardamos su ID
    document.getElementById('modal-objetivos').style.display = 'flex';
    const contenedorLista = document.getElementById('lista-eventos-objetivos');
    contenedorLista.innerHTML = "<p style='text-align:center; color:white;'>Cargando eventos...</p>";

    try {
        // 1. Traemos los datos del usuario para saber qué tenía marcado ya
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);
        const objetivosMarcados = userSnap.exists() ? (userSnap.data().objetivosId || []) : [];

        // 2. Traemos TODOS los eventos disponibles
        const eventosSnapshot = await getDocs(collection(db, "eventos"));
        contenedorLista.innerHTML = ""; // Limpiamos el "Cargando..."

        if (eventosSnapshot.empty) {
            contenedorLista.innerHTML = "<p style='color:white; text-align:center;'>No hay eventos disponibles aún.</p>";
            return;
        }

        // 3. Dibujamos cada evento con su checkbox
        eventosSnapshot.forEach(doc => {
            const evento = doc.data();
            const estaMarcado = objetivosMarcados.includes(doc.id) ? "checked" : "";
            
            // ¡EL ARREGLO ESTÁ AQUÍ! Usamos 'puntosRecompensa' tal y como está en tu Base de Datos
            const puntosDelEvento = evento.puntosRecompensa || 0;
            
            contenedorLista.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; margin-bottom: 5px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: white; width: 100%;">
                        <input type="checkbox" class="checkbox-objetivo" value="${doc.id}" data-puntos="${puntosDelEvento}" ${estaMarcado} style="width: 18px; height: 18px;">
                        <span style="flex: 1;">${evento.nombre}</span>
                        <span style="color: #a4f5a7; font-weight: bold;">${puntosDelEvento} pts</span>
                    </label>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error al cargar objetivos:", error);
        contenedorLista.innerHTML = "<p style='color:#ff4d4d;'>Error al cargar los eventos.</p>";
    }
}

window.guardarObjetivos = async function() {
    if (!usuarioConectadoActual) return;

    try {
        const checkboxes = document.querySelectorAll('.checkbox-objetivo:checked');
        let totalPuntosMeta = 0;
        let idsMarcados = [];

        checkboxes.forEach(box => {
            idsMarcados.push(box.value); 
            totalPuntosMeta += parseInt(box.getAttribute('data-puntos')) || 0; 
        });

        // (Hemos eliminado la línea que forzaba el 1. Ahora si es 0, se guarda 0).

        const userRef = doc(db, "usuarios", usuarioConectadoActual);
        await updateDoc(userRef, {
            objetivosId: idsMarcados,
            metaPuntos: totalPuntosMeta
        });

        cerrarModalObjetivos();
        cargarDatosPerfil(auth.currentUser); 

    } catch (error) {
        console.error("Error al guardar metas:", error);
        alert("❌ Hubo un error al guardar tus objetivos.");
    }
}

window.cerrarModalObjetivos = function() {
    document.getElementById('modal-objetivos').style.display = 'none';
}

// SEGURIDAD PARA ENTRAR EN ADMIN
onAuthStateChanged(auth, async (user) => {
    // Obtenemos la ruta y la limpiamos de posibles "/" finales o dominios
    const rutaPagina = window.location.pathname.toLowerCase();

    if (user) {
        console.log("Guardián: Usuario detectado ->", user.email);

        // --- CASO 1: ACCESO A ADMIN ---
        if (rutaPagina.includes("admin.html")) {
            if (user.email === CORREO_ADMIN) {
                cargarPanelAdminCompleto();
                mostrarUsuariosAdmin();
            } else {
                alert("Acceso denegado. Zona exclusiva para administradores.");
                window.location.href = "principal.html"; 
            }
        } 
        // --- CASO 2: ACCESO AL CARNÉ ---
        else if (rutaPagina.includes("principal.html")) {
            cargarDatosPerfil(user);
        } 
        // --- CASO 3: REDIRECCIÓN DESDE LOGIN/REGISTRO/RAÍZ ---
        // Si estamos en el index, en la raíz "/" o en registro, y YA hay usuario:
        else if (rutaPagina.includes("index.html") || rutaPagina === "/" || rutaPagina === "" || rutaPagina.endsWith("/")) {
            
            console.log("Guardián: Redirigiendo a la zona correspondiente...");
            
            if (user.email === CORREO_ADMIN) {
                window.location.href = "admin.html"; 
            } else {
                window.location.href = "principal.html"; 
            }
        }
    } else {
        // --- SI NO HAY NADIE LOGUEADO ---
        // Si intenta entrar a principal o admin sin estar logueado, al login.
        const zonaProtegida = rutaPagina.includes("principal.html") || rutaPagina.includes("admin.html");
        
        if (zonaProtegida) {
            console.log("Guardián: Sin sesión. Volviendo al login.");
            window.location.href = "index.html";
        }
    }
});