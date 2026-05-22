import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "./firebase.config.js";

window.verificarCodigoRegistro = async function() {
    const inputCodigo = document.getElementById('input-codigo-verificacion').value.trim();

    if (inputCodigo.length !== 4) {
        return mostrarToastNotificacion("El código debe tener 4 dígitos.", "aviso");
    }

    try {
        const configRef = doc(db, "config", "registro");
        const configSnap = await getDoc(configRef);

        if (!configSnap.exists()) {
            return mostrarToastNotificacion("Error al verificar el código. Contacta con el administrador.", "error");
        }

        const codigoCorrecto = configSnap.data().codigo;

        if (inputCodigo === codigoCorrecto) {
            // Código correcto: ocultar modal y mostrar formulario
            document.getElementById('modal-codigo-registro').style.display = 'none';
            const contenedor = document.getElementById('contenedor-registro');
            contenedor.style.display = 'flex';
        } else {
            mostrarToastNotificacion("Código incorrecto. Inténtalo de nuevo.", "error");
            document.getElementById('input-codigo-verificacion').value = "";
        }

    } catch (error) {
        console.error("Error al verificar código:", error);
        mostrarToastNotificacion("Error de conexión. Inténtalo de nuevo.", "error");
    }
}

// Permitir verificar pulsando Enter en el input
document.getElementById('input-codigo-verificacion').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') verificarCodigoRegistro();
});