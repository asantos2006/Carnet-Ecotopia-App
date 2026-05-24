import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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
            await actualizarProgresoUI(datos);
            actualizarHistorialUI(datos.historial || []);
            generarCodigoQR(user.uid);
            cargarProximosEventos();
        }
    } catch (error) {
        console.error("Error al cargar el perfil:", error);
    }
}

window.actualizarProgresoUI = async function(datos) {
    const historial = datos.historial || [];
    const actividadesRealizadas = historial.length;
    const puntosTotales = datos.puntosTotales || 0;

    // 1. Consultamos el total de eventos reales por seguridad / fallback
    const eventosSnapshot = await getDocs(collection(db, "eventos"));
    const totalEventosRealizados = eventosSnapshot.size;

    // 2. NUEVA LÓGICA: Leemos el objetivo único fijado por el Admin en Firestore
    let metaCurso = totalEventosRealizados > 0 ? totalEventosRealizados : 10; // Fallback inteligente
    try {
        const configSnap = await getDoc(doc(db, "config", "objetivo"));
        if (configSnap.exists()) {
            metaCurso = configSnap.data().meta || metaCurso;
        }
    } catch (e) {
        console.error("Error al cargar la meta global, usando eventos totales:", e);
    }

    // Calcular el porcentaje basándonos en la meta manual del administrador
    const porcentaje = metaCurso > 0
        ? Math.min(Math.round((actividadesRealizadas / metaCurso) * 100), 100)
        : 0;

    // Racha: eventos asistidos en los últimos 30 días consecutivos
    const ahora = new Date();
    const hace30dias = new Date();
    hace30dias.setDate(ahora.getDate() - 30);
    const racha = historial.filter(act => {
        if (!act.fecha) return false;
        const f = act.fecha.toDate ? act.fecha.toDate() : new Date(act.fecha);
        return f >= hace30dias;
    }).length;

    // Barra de progreso horizontal
    const barra = document.getElementById('barra-progreso-perfil');
    if (barra) barra.style.width = `${porcentaje}%`;

    // Texto de progreso dinámico ajustado al nuevo objetivo
    const elementoTexto = document.getElementById("texto-progreso");
    if (elementoTexto) {
        elementoTexto.innerText = `Has asistido a ${actividadesRealizadas} actividades ¡Vamos a por esa meta de ${metaCurso}!`;
    }

    // Stats visuales de las tarjetitas
    const statPuntos = document.getElementById('stat-puntos');
    const statRacha = document.getElementById('stat-racha');

    if (statPuntos) statPuntos.innerText = puntosTotales;
    if (statRacha) statRacha.innerText = racha > 0 ? racha : '—';
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

window.formatearFechaHistorial = function(fecha) {
    if (!fecha) return "";
    const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return d.toLocaleDateString('es-ES');
}

window.cargarProximosEventos = async function() {
    const contenedor = document.getElementById('alertas-proximos-eventos');
    if (!contenedor) return;

    try {
        const eventosSnapshot = await getDocs(collection(db, "eventos"));
        const proximos = [];
        const ahora = new Date();

        eventosSnapshot.forEach(docEvento => {
            const evento = docEvento.data();
            
            // NUEVA LÓGICA: Ahora dependemos estrictamente del interruptor del Admin
            if (evento.notificar === true) {
                let fechaEvento = new Date(); // Fecha de seguridad
                if (evento.fechaEvento) {
                    const fechaHoraStr = evento.horaEvento
                        ? `${evento.fechaEvento}T${evento.horaEvento}`
                        : `${evento.fechaEvento}T00:00`;
                    fechaEvento = new Date(fechaHoraStr);
                }
                
                proximos.push({ id: docEvento.id, ...evento, _fechaObj: fechaEvento });
            }
        });

        if (proximos.length === 0) {
            contenedor.innerHTML = '';
            return;
        }

        // Ordenar por fecha ascendente
        proximos.sort((a, b) => a._fechaObj - b._fechaObj);

        let html = '';
        proximos.forEach(evento => {
            // Normalizamos fechas a las 00:00 para hacer un cálculo de días perfecto sin saltos de franja horaria
            const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
            const diaDelEvento = new Date(evento._fechaObj.getFullYear(), evento._fechaObj.getMonth(), evento._fechaObj.getDate());
            
            const diasRestantes = Math.round((diaDelEvento - hoy) / (1000 * 60 * 60 * 24));
            
            let etiquetaTiempo = '';
            if (diasRestantes === 0) etiquetaTiempo = '¡Hoy!';
            else if (diasRestantes === 1) etiquetaTiempo = 'Mañana';
            else if (diasRestantes > 1) etiquetaTiempo = `En ${diasRestantes} días`;
            else if (diasRestantes < 0) etiquetaTiempo = 'Finalizado'; // Por si se te olvida apagar el botón de un evento viejo

            const fechaFormateada = evento._fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            const horaFormateada = evento.horaEvento ? ` a las ${evento.horaEvento}` : '';

            html += `
                <div onclick="abrirModalDetalleEvento('${evento.id}')"
                    style="background: linear-gradient(135deg, rgba(98,197,102,0.15), rgba(126,217,87,0.08));
                           border: 1px solid rgba(98,197,102,0.5);
                           border-left: 4px solid #62c566;
                           border-radius: 12px;
                           padding: 12px 15px;
                           margin-bottom: 10px;
                           cursor: pointer;
                           transition: transform 0.15s, box-shadow 0.15s;"
                >
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        <span style="color: white; font-weight: bold; font-size: 0.95em; flex: 1; margin-right: 8px;">
                            🌿 ${evento.nombre}
                        </span>
                        <span style="background: rgba(98,197,102,0.3); color: #a4f5a7; font-size: 0.7em; font-weight: bold; padding: 3px 8px; border-radius: 20px; white-space: nowrap;">
                            ${etiquetaTiempo}
                        </span>
                    </div>
                    <div style="color: #c4c4c4; font-size: 0.78em; display: flex; flex-direction: column; gap: 3px;">
                        <span>📅 ${fechaFormateada}${horaFormateada}</span>
                        ${evento.lugar ? `<span>📍 ${evento.lugar}</span>` : ''}
                    </div>
                </div>
            `;
        });

        contenedor.innerHTML = `
            <div style="margin-bottom: 15px;">
                <p style="color: var(--color-primary-light); font-size: 0.75em; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: bold;">
                    🔔 Eventos Destacados
                </p>
                ${html}
            </div>
            <hr class="separador" style="margin-top: 5px;">
        `;

    } catch (error) {
        console.error("Error al cargar próximos eventos:", error);
    }
}

// Cache de eventos para el modal de detalle (evita releer Firestore)
let _cachEventos = {};

window.abrirModalDetalleEvento = async function(idEvento) {
    document.getElementById('modal-detalle-evento').style.display = 'flex';

    // Si no está en caché, lo leemos
    if (!_cachEventos[idEvento]) {
        try {
            const snap = await getDoc(doc(db, "eventos", idEvento));
            if (snap.exists()) _cachEventos[idEvento] = snap.data();
        } catch (e) {
            console.error("Error al cargar detalle:", e);
            return;
        }
    }

    const ev = _cachEventos[idEvento];
    if (!ev) return;

    document.getElementById('detalle-nombre').innerText = ev.nombre || '';
    document.getElementById('detalle-categoria').innerText = ev.categoria ? `🏷️ ${ev.categoria}` : '';
    document.getElementById('detalle-puntos').innerText = `+${ev.puntosRecompensa || 0} pts`;

    // Fecha y lugar
    let fechaLugar = '';
    if (ev.fechaEvento) {
        const fechaHoraStr = ev.horaEvento ? `${ev.fechaEvento}T${ev.horaEvento}` : `${ev.fechaEvento}T00:00`;
        const fechaObj = new Date(fechaHoraStr);
        const fechaFormateada = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const horaFormateada = ev.horaEvento ? ` a las ${ev.horaEvento}` : '';
        fechaLugar += `<span>📅 ${fechaFormateada}${horaFormateada}</span>`;
    }
    if (ev.lugar) fechaLugar += `<span>📍 ${ev.lugar}</span>`;
    document.getElementById('detalle-fecha-lugar').innerHTML = fechaLugar || '<span style="color:rgba(255,255,255,0.3)">Sin fecha ni lugar especificados</span>';

    // Descripción
    const bloqueDesc = document.getElementById('detalle-descripcion-bloque');
    const textoDesc = document.getElementById('detalle-descripcion');
    if (ev.descripcion) {
        textoDesc.innerText = ev.descripcion;
        bloqueDesc.style.display = 'block';
    } else {
        bloqueDesc.style.display = 'none';
    }

    // Ponentes
    const bloquePonentes = document.getElementById('detalle-ponentes-bloque');
    const contenedorPonentes = document.getElementById('detalle-ponentes');
    if (ev.ponentes && ev.ponentes.length > 0) {
        contenedorPonentes.innerHTML = ev.ponentes.map(p =>
            `<p style="color: #c4c4c4; font-size: 0.85em; margin-bottom: 4px;">🎙️ ${p}</p>`
        ).join('');
        bloquePonentes.style.display = 'block';
    } else {
        bloquePonentes.style.display = 'none';
    }
}

window.cerrarModalDetalleEvento = function() {
    document.getElementById('modal-detalle-evento').style.display = 'none';
}