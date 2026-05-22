import { doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase.config.js";

let qrYaGenerado = false;

window.cargarDatosPerfil = async function(user) {
    if (!user) return;

    try {
        const userRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            const datos = docSnap.data();
            document.getElementById('nombre-usuario').innerText = datos.nombre || "Usuario";
            actualizarProgresoUI(datos);
            actualizarHistorialUI(datos.historial || []);
            generarCodigoQR(user.uid);
        }
    } catch (error) {
        console.error("Error al cargar el perfil:", error);
    }
}

window.actualizarProgresoUI = function(datos) {
    const puntosTotales = datos.puntosTotales || 0;
    const metaPersonal = datos.metaPuntos || 0;

    const elementoTextoMeta = document.getElementById("texto-meta");
    const elementoPorcentaje = document.getElementById('porcentaje-texto');
    const anilloProgreso = document.getElementById("anillo-progreso");

    if (metaPersonal === 0) {
        if (elementoTextoMeta) elementoTextoMeta.innerText = "¡Márcate un objetivo de EcoPoints!";
        if (elementoPorcentaje) elementoPorcentaje.innerText = "0%";
        if (anilloProgreso) anilloProgreso.style.background = `conic-gradient(rgba(255,255,255,0.2) 100%, transparent 0)`;
    } else {
        if (elementoTextoMeta) elementoTextoMeta.innerText = `Vamos a por esos ${metaPersonal} ecopoints`;

        let porcentaje = (puntosTotales / metaPersonal) * 100;
        if (porcentaje > 100) porcentaje = 100;

        if (elementoPorcentaje) elementoPorcentaje.innerText = `${Math.floor(porcentaje)}%`;
        if (anilloProgreso) {
            anilloProgreso.style.background = `conic-gradient(var(--color-primary-dark) ${porcentaje}%, rgba(255,255,255,0.2) ${porcentaje}%)`;
        }
    }
}

window.actualizarHistorialUI = function(historial) {
    const contenedorActividades = document.getElementById('lista-actividades-usuario');
    if (!contenedorActividades) return;

    if (historial.length === 0) {
        contenedorActividades.innerHTML = `<p id="mensaje-vacio" style="font-size: 0.8em; color: rgba(255,255,255,0.5);">Aún no has participado en eventos.</p>`;
        return;
    }

    const historialInvertido = [...historial].reverse();
    let html = "";

    historialInvertido.forEach(actividad => {
        html += `
            <div class="item-actividad" style="display: flex; justify-content: space-between; margin-bottom: 8px; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
                <div>
                    <span>🌿 ${actividad.nombre}</span>
                    ${actividad.fecha ? `<p style="font-size: 0.75em; color: rgba(255,255,255,0.4); margin-top: 3px;">📅 ${formatearFechaHistorial(actividad.fecha)}</p>` : ''}
                </div>
                <span style="color: var(--color-primary-dark); font-weight: bold;">+${actividad.puntos}</span>
            </div>
        `;
    });

    contenedorActividades.innerHTML = html;
}

window.generarCodigoQR = function(uid) {
    if (qrYaGenerado) return;

    const contenedorQR = document.getElementById("qrcode");
    if (contenedorQR) {
        contenedorQR.innerHTML = "";
        new QRCode(contenedorQR, {
            text: uid,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff"
        });
        qrYaGenerado = true;
    }
}

window.recargarDatosManual = function() {
    const user = auth.currentUser;
    if (user) {
        qrYaGenerado = false;
        cargarDatosPerfil(user);
    } else {
        window.location.href = "index.html";
    }
}

window.abrirModalObjetivos = async function() {
    const user = auth.currentUser;
    if (!user) return mostrarToastNotificacion("Debes iniciar sesión primero.", "error");

    document.getElementById('modal-objetivos').style.display = 'flex';
    const contenedorLista = document.getElementById('lista-eventos-objetivos');
    contenedorLista.innerHTML = "<p style='text-align:center; color:white;'>Cargando eventos...</p>";

    try {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);
        const objetivosMarcados = userSnap.exists() ? (userSnap.data().objetivosId || []) : [];

        const eventosSnapshot = await getDocs(collection(db, "eventos"));
        let html = "";

        if (eventosSnapshot.empty) {
            contenedorLista.innerHTML = "<p style='color:white; text-align:center;'>No hay eventos disponibles aún.</p>";
            return;
        }

        eventosSnapshot.forEach(doc => {
            const evento = doc.data();
            const estaMarcado = objetivosMarcados.includes(doc.id) ? "checked" : "";
            const puntosDelEvento = evento.puntosRecompensa || 0;

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; margin-bottom: 5px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: white; width: 100%;">
                        <input type="checkbox" class="checkbox-objetivo" value="${doc.id}" data-puntos="${puntosDelEvento}" ${estaMarcado} style="width: 18px; height: 18px;">
                        <span style="flex: 1;">${evento.nombre}</span>
                        <span style="color: var(--color-primary-light); font-weight: bold;">${puntosDelEvento} pts</span>
                    </label>
                </div>
            `;
        });

        contenedorLista.innerHTML = html;

    } catch (error) {
        console.error("Error al cargar objetivos:", error);
        contenedorLista.innerHTML = "<p style='color:#ff4d4d;'>Error al cargar los eventos.</p>";
    }
}

window.guardarObjetivos = async function() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const checkboxes = document.querySelectorAll('.checkbox-objetivo:checked');
        let totalPuntosMeta = 0;
        let idsMarcados = [];

        checkboxes.forEach(box => {
            idsMarcados.push(box.value);
            totalPuntosMeta += parseInt(box.getAttribute('data-puntos')) || 0;
        });

        const userRef = doc(db, "usuarios", user.uid);  // 👈 aquí
        await updateDoc(userRef, {
            objetivosId: idsMarcados,
            metaPuntos: totalPuntosMeta
        });

        cerrarModalObjetivos();
        cargarDatosPerfil(auth.currentUser);

    } catch (error) {
        console.error("Error al guardar metas:", error);
        mostrarToastNotificacion("Hubo un error al guardar tus objetivos.", "error");
    }
}

window.cerrarModalObjetivos = function() {
    document.getElementById('modal-objetivos').style.display = 'none';
}

window.formatearFechaHistorial = function(fecha) {
    if (!fecha) return "";
    const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return d.toLocaleDateString('es-ES');
}