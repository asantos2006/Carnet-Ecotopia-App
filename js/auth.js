import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db, CORREO_ADMIN } from "./firebase.config.js";

window.registrarUsuario = async function(event) {
    event.preventDefault();
    const valorNombre = document.getElementById('nombre').value;
    const valorEmail = document.getElementById('email').value;
    const valorPassword = document.getElementById('password').value;

    try {
        const credenciales = await createUserWithEmailAndPassword(auth, valorEmail, valorPassword);
        const usuarioFirebase = credenciales.user;

        await setDoc(doc(db, "usuarios", usuarioFirebase.uid), {
            nombre: valorNombre,
            email: valorEmail,
            puntosTotales: 0,
            fechaRegistro: new Date()
        });

        mostrarToastNotificacion(`¡Registro exitoso, ${valorNombre}! Entrando a tu carné...`, "exito");
        window.location.href = "principal.html";

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            mostrarToastNotificacion("Este correo ya está registrado. Ve a Iniciar Sesión o usa otro correo.", "error");
        } else if (error.code === 'auth/weak-password') {
            mostrarToastNotificacion("La contraseña es muy corta. Mínimo 6 caracteres.", "error");
        } else if (error.code === 'auth/invalid-email') {
            mostrarToastNotificacion("El formato del correo electrónico no es válido.", "error");
        } else {
            mostrarToastNotificacion("Ups, hubo un error. Inténtalo de nuevo.", "error");
        }
    }
}

window.iniciarSesion = async function(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('email-login').value;
    const pass = document.getElementById('password-login').value;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        mostrarToastNotificacion("Correo o contraseña incorrectos.", "error");
    }
}

window.cerrarSesion = async function() {
    try {
        await signOut(auth);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        window.location.href = "index.html";
    }
}

window.mostrarToastNotificacion = function(mensaje, tipo = "exito") {
    const toast = document.getElementById('toast-notificacion');
    if (!toast) return;

    // Color según el tipo
    if (tipo === "exito") {
        toast.style.backgroundColor = "#62c566";
        toast.style.color = "#0d1a0e";
    } else if (tipo === "error") {
        toast.style.backgroundColor = "#ff4d4d";
        toast.style.color = "white";
    } else if (tipo === "aviso") {
        toast.style.backgroundColor = "#ffcc00";
        toast.style.color = "#000";
    }

    toast.innerText = mensaje;
    toast.classList.add('toast-visible');

    setTimeout(() => {
        toast.classList.remove('toast-visible');
    }, 3000);
}

window.recuperarContrasena = async function() {
    const email = document.getElementById('email-recuperacion').value.trim();

    if (!email) {
        return mostrarToastNotificacion("Introduce tu correo electrónico.", "aviso");
    }

    try {
        await sendPasswordResetEmail(auth, email);
        mostrarToastNotificacion("📧 Correo de recuperación enviado. Revisa tu bandeja.", "exito");
        cerrarModalRecuperacion();
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            mostrarToastNotificacion("No existe ninguna cuenta con ese correo.", "error");
        } else if (error.code === 'auth/invalid-email') {
            mostrarToastNotificacion("El formato del correo no es válido.", "error");
        } else {
            mostrarToastNotificacion("Error al enviar el correo. Inténtalo de nuevo.", "error");
        }
    }
}

window.abrirModalRecuperacion = function() {
    document.getElementById('modal-recuperacion').style.display = 'flex';
}

window.cerrarModalRecuperacion = function() {
    document.getElementById('modal-recuperacion').style.display = 'none';
    document.getElementById('email-recuperacion').value = '';
}

onAuthStateChanged(auth, async (user) => {
    const rutaPagina = window.location.pathname.toLowerCase();

    if (user) {
        if (rutaPagina.includes("admin.html")) {
            if (user.email === CORREO_ADMIN) {
                if (typeof cargarPanelAdminCompleto === "function") cargarPanelAdminCompleto();
                if (typeof mostrarUsuariosAdmin === "function") mostrarUsuariosAdmin();
            } else {
                mostrarToastNotificacion("Acceso denegado. Zona exclusiva para administradores.", "error");
                window.location.href = "principal.html";
            }
        }
        else if (rutaPagina.includes("principal.html")) {
            if (typeof cargarDatosPerfil === "function") cargarDatosPerfil(user);
            if (user.email === CORREO_ADMIN) {
                const boton = document.getElementById('boton-volver-admin');
                if (boton) boton.style.display = 'block';
            }
        }
        else if (rutaPagina.includes("index.html") || rutaPagina === "/" || rutaPagina === "" || rutaPagina.endsWith("/")) {
            if (user.email === CORREO_ADMIN) {
                window.location.href = "admin.html";
            } else {
                window.location.href = "principal.html";
            }
        }
    } else {
        const zonaProtegida = rutaPagina.includes("principal.html") || rutaPagina.includes("admin.html");
        if (zonaProtegida) {
            window.location.href = "index.html";
        }
    }
});

// Navegación con Enter en formularios
document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter') return;

    const ruta = window.location.pathname.toLowerCase();

    if (ruta.includes('index.html') || ruta === '/' || ruta === '' || ruta.endsWith('/')) {
        // Si el modal de recuperación está abierto, disparar ese botón
        const modalRecuperacion = document.getElementById('modal-recuperacion');
        if (modalRecuperacion && modalRecuperacion.style.display === 'flex') {
            recuperarContrasena();
        } else {
            iniciarSesion(e);
        }
    }

    if (ruta.includes('registro.html')) {
        // Solo si el modal de código está cerrado (ya tiene su propio listener)
        const modalCodigo = document.getElementById('modal-codigo-registro');
        if (modalCodigo && modalCodigo.style.display === 'none') {
            document.getElementById('formulario-registro').requestSubmit();
        }
    }
});