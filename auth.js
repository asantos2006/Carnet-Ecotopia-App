import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
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

        alert("¡Registro exitoso, " + valorNombre + "! Entrando a tu carné...");
        window.location.href = "principal.html";

    } catch (error) {
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
    const email = document.getElementById('email-login').value;
    const pass = document.getElementById('password-login').value;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        alert("Correo o contraseña incorrectos");
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

onAuthStateChanged(auth, async (user) => {
    const rutaPagina = window.location.pathname.toLowerCase();

    if (user) {
        if (rutaPagina.includes("admin.html")) {
            if (user.email === CORREO_ADMIN) {
                if (typeof cargarPanelAdminCompleto === "function") cargarPanelAdminCompleto();
                if (typeof mostrarUsuariosAdmin === "function") mostrarUsuariosAdmin();
            } else {
                alert("Acceso denegado. Zona exclusiva para administradores.");
                window.location.href = "principal.html";
            }
        }
        else if (rutaPagina.includes("principal.html")) {
            if (typeof cargarDatosPerfil === "function") cargarDatosPerfil(user);
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