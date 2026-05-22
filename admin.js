import { doc, getDoc, setDoc, updateDoc, deleteDoc, increment, collection, getDocs, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase.config.js";

let escanerModalActivo = null;
let eventoEscaneandoActual = null;
let qrProcesando = false;

window.crearEvento = async function() {
    const nombreVal = document.getElementById('nombre-evento').value.trim();
    const puntosVal = parseInt(document.getElementById('puntos-evento').value);

    if (!nombreVal || isNaN(puntosVal)) return mostrarToastNotificacion("Rellena el nombre y los puntos del evento.", "aviso");

    try {
        const nuevoEventoRef = doc(collection(db, "eventos"));
        await setDoc(nuevoEventoRef, {
            nombre: nombreVal,
            puntosRecompensa: puntosVal,
            date: new Date()
        });
        mostrarToastNotificacion("✅ Evento creado con éxito.", "exito");
        document.getElementById('nombre-evento').value = "";
        document.getElementById('puntos-evento').value = "10";
        cargarPanelAdminCompleto();
    } catch (e) { console.error(e); }
}

window.mostrarUsuariosAdmin = async function() {
    const contenedor = document.getElementById('lista-usuarios');
    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        let html = "";

        querySnapshot.forEach((usuarioDoc) => {
            const datos = usuarioDoc.data();
            const nombreUsuario = datos.nombre || "Estudiante";
            const puntosTotales = datos.puntosTotales || 0;

            html += `
                <div class="fila-usuario" style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: white; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                        <strong>${nombreUsuario}</strong>
                    </span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="btn-puntos" style="cursor: default; pointer-events: none; font-size: 0.8em; padding: 5px 12px;">
                            ${puntosTotales} pts
                        </span>
                        <button class="btn-puntos" onclick="abrirModalUsuario('${usuarioDoc.id}')" style="background: transparent; border: 1px solid var(--color-primary-dark); padding: 4px 8px; font-size: 1em;">
                            ℹ️
                        </button>
                    </div>
                </div>
            `;
        });

        contenedor.innerHTML = html;
    } catch (e) {
        contenedor.innerHTML = "<p style='color: red;'>Error al cargar usuarios.</p>";
        console.error("Error al mostrar usuarios:", e);
    }
}

window.cargarPanelAdminCompleto = async function() {
    const contenedorEventos = document.getElementById('lista-eventos-admin');
    if (!contenedorEventos) return;

    try {
        const snapshotUsuarios = await getDocs(collection(db, "usuarios"));
        let opcionesUsuarios = `<option value="">Selecciona un estudiante...</option>`;
        snapshotUsuarios.forEach(u => {
            const data = u.data();
            opcionesUsuarios += `<option value="${u.id}">${data.nombre}</option>`;
        });

        const snapshotEventos = await getDocs(collection(db, "eventos"));
        let html = "";

        snapshotEventos.forEach((docEvento) => {
            const evento = docEvento.data();
            const idEvento = docEvento.id;
            const nombreEvento = evento.nombre || "Evento sin nombre";
            const puntosEvento = evento.puntosRecompensa || 0;

            html += `
                <div class="fila-usuario">
                    <div style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px;">
                            <strong style="color: var(--color-primary-dark); font-size: 0.95em; flex: 1; word-break: break-word;">
                                ${nombreEvento}
                            </strong>
                            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                                <button class="btn-icono-rojo" onclick="borrarEvento('${idEvento}', '${nombreEvento}')">
                                    🗑️
                                </button>
                                <button class="btn-icono-verde" onclick="abrirCamaraModal('${idEvento}', '${nombreEvento}', ${puntosEvento})">
                                    📷
                                </button>
                                <span class="tag-puntos">${puntosEvento} pts</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 5px; width: 100%;">
                            <select id="select-${idEvento}" class="input-estilo" style="padding: 6px; font-size: 0.8em; flex: 1; min-width: 0;">
                                ${opcionesUsuarios}
                            </select>
                            <button class="btn-puntos" onclick="registrarAsistenciaManual('${idEvento}', '${nombreEvento}', ${puntosEvento})" style="padding: 6px 12px; white-space: nowrap;">
                                Fichar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        contenedorEventos.innerHTML = html;
    } catch (e) {
        console.error("Error al cargar panel:", e);
    }
}

window.procesarFichaje = async function(idUsuario, nombreEvento, puntosASumar) {
    if (!idUsuario) {
        return { exito: false, tipo: "vacio", mensaje: "No se ha seleccionado ningún estudiante." };
    }

    try {
        const userRef = doc(db, "usuarios", idUsuario);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            const historial = docSnap.data().historial || [];
            const yaLoTiene = historial.some(act => act.nombre === nombreEvento);
            if (yaLoTiene) {
                return { exito: false, tipo: "duplicado", mensaje: "Este alumno ya tenía este evento registrado." };
            }
        }

        await updateDoc(userRef, {
            puntosTotales: increment(puntosASumar),
            historial: arrayUnion({
                nombre: nombreEvento,
                puntos: puntosASumar,
                fecha: new Date()
            })
        });

        return { exito: true, tipo: "ok", mensaje: `¡+${puntosASumar} pts añadidos correctamente!` };

    } catch (e) {
        console.error("Error en la base de datos:", e);
        return { exito: false, tipo: "error", mensaje: "Error de conexión con la base de datos." };
    }
}

window.registrarAsistenciaManual = async function(idEvento, nombreEvento, puntosASumar) {
    const idUsuario = document.getElementById(`select-${idEvento}`).value;
    const resultado = await procesarFichaje(idUsuario, nombreEvento, puntosASumar);

    if (resultado.exito) {
        mostrarToastNotificacion(resultado.mensaje, "exito");
        cargarPanelAdminCompleto();
        mostrarUsuariosAdmin();
    } else if (resultado.tipo === "duplicado") {
        mostrarToastNotificacion(`El estudiante ya tiene registrado "${nombreEvento}".`, "aviso");
    } else {
        mostrarToastNotificacion(resultado.mensaje, "error");
    }
}

window.registrarAsistenciaQR = async function(idUsuarioEscaneado, evento) {
    const resultado = await procesarFichaje(idUsuarioEscaneado, evento.nombreEvento, evento.puntosEvento);

    if (resultado.exito) {
        mostrarToastNotificacion(`✅ ${resultado.mensaje}`, "exito");
        cargarPanelAdminCompleto();
        mostrarUsuariosAdmin();
    } else if (resultado.tipo === "duplicado") {
        mostrarToastNotificacion(`⚠️ ${resultado.mensaje}`, "aviso");
    } else {
        mostrarToastNotificacion(`❌ ${resultado.mensaje}`, "error");
    }
}

window.procesarBorradoFichaje = async function(idUsuario, nombreEvento, historialPrevio = null) {
    try {
        const userRef = doc(db, "usuarios", idUsuario);

        let historialActual;
        if (historialPrevio !== null) {
            historialActual = historialPrevio;
        } else {
            const docSnap = await getDoc(userRef);
            if (!docSnap.exists()) return { exito: false, mensaje: "Usuario no encontrado" };
            historialActual = docSnap.data().historial || [];
        }

        const tieneElEvento = historialActual.some(act => act.nombre === nombreEvento);
        if (!tieneElEvento) {
            return { exito: false, mensaje: "El usuario no tiene este evento en su historial" };
        }

        const eventoData = historialActual.find(act => act.nombre === nombreEvento);
        const puntosARestar = eventoData.puntos;
        const nuevoHistorial = historialActual.filter(act => act.nombre !== nombreEvento);

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

window.borrarFichajeManual = async function(idUsuario, nombreEvento) {
    const confirmacion = confirm(`¿Seguro que quieres quitar el evento "${nombreEvento}" de este estudiante?\n\nSe le restarán los puntos automáticamente.`);
    if (!confirmacion) return;

    const resultado = await procesarBorradoFichaje(idUsuario, nombreEvento);

    if (resultado.exito) {
        mostrarToastNotificacion(resultado.mensaje, "exito");
        abrirModalUsuario(idUsuario);
        mostrarUsuariosAdmin();
    } else {
        mostrarToastNotificacion(resultado.mensaje, "error");
    }
}

window.borrarEvento = async function(idEvento, nombreEvento) {
    const confirmacion = confirm(`¿Estás seguro de que quieres eliminar el evento "${nombreEvento}"?\n\n⚠️ IMPORTANTE: Esta acción también eliminará el evento del historial de TODOS los estudiantes que hayan participado y les restará los puntos.`);

    if (confirmacion) {
        try {
            await deleteDoc(doc(db, "eventos", idEvento));

            const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
            const promesasDeBorrado = [];

            usuariosSnapshot.forEach((usuarioDoc) => {
                const historial = usuarioDoc.data().historial || [];
                if (historial.some(act => act.nombre === nombreEvento)) {
                    promesasDeBorrado.push(procesarBorradoFichaje(usuarioDoc.id, nombreEvento, historial));
                }
            });

            await Promise.all(promesasDeBorrado);

            alert("✅ Evento borrado por completo. Se han actualizado los historiales de los estudiantes.");
            cargarPanelAdminCompleto();
            mostrarUsuariosAdmin();

        } catch (error) {
            console.error("Error al borrar evento en cascada:", error);
            alert("❌ Hubo un problema al borrar el evento.");
        }
    }
}

window.abrirCamaraModal = function(idEvento, nombreEvento, puntosEvento) {
    eventoEscaneandoActual = { idEvento, nombreEvento, puntosEvento };
    document.getElementById('titulo-modal-escaner').innerText = `Escaneando para:\n${nombreEvento}`;
    document.getElementById('modal-escaner').style.display = 'flex';

    escanerModalActivo = new Html5Qrcode("reader");
    escanerModalActivo.start(
        { facingMode: "environment" },
        { fps: 5, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            if (qrProcesando) return;
            qrProcesando = true;
            registrarAsistenciaQR(decodedText, eventoEscaneandoActual);
            setTimeout(() => { qrProcesando = false; }, 2500);
        }
    ).catch(err => {
        console.error("Error de cámara:", err);
        mostrarToastNotificacion("No se pudo encender la cámara.", "error");
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
    document.getElementById('modal-escaner').style.display = 'none';
    eventoEscaneandoActual = null;
}

window.abrirModalUsuario = async function(idUsuario) {
    try {
        const userRef = doc(db, "usuarios", idUsuario);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            const datos = docSnap.data();

            document.getElementById('info-nombre').innerText = datos.nombre || "Estudiante";
            document.getElementById('info-email').innerText = datos.email || "Sin correo asociado";

            let fechaTexto = "Fecha desconocida";
            if (datos.fechaRegistro) {
                const fechaDate = datos.fechaRegistro.toDate ? datos.fechaRegistro.toDate() : new Date(datos.fechaRegistro);
                fechaTexto = fechaDate.toLocaleDateString() + " a las " + fechaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            document.getElementById('info-fecha').innerText = `Registrado el: ${fechaTexto}`;

            const tbody = document.getElementById('info-tabla-historial');
            const historial = datos.historial || [];
            let html = "";

            if (historial.length === 0) {
                html = `<tr><td colspan="2" style="text-align: center; padding: 15px; color: rgba(255,255,255,0.4); font-style: italic;">Aún no ha participado en actividades</td></tr>`;
            } else {
                const historialInvertido = [...historial].reverse();
                historialInvertido.forEach(act => {
                    html += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <td style="padding: 8px 0; color: #c4c4c4;">🌿 ${act.nombre}</td>
                            <td style="text-align: right; padding: 8px 0; color: var(--color-primary-light); font-weight: bold; display: flex; justify-content: flex-end; align-items: center; gap: 10px;">
                                +${act.puntos}
                                <button onclick="borrarFichajeManual('${idUsuario}', '${act.nombre}')" style="background: transparent; border: none; color: #ff4d4d; cursor: pointer; font-size: 1.1em;" title="Borrar este fichaje">
                                    🗑️
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }

            tbody.innerHTML = html;
            document.getElementById('info-total-puntos').innerText = `${datos.puntosTotales || 0} pts`;
            document.getElementById('modal-info-usuario').style.display = 'flex';
        }
    } catch (error) {
        console.error("Error al cargar info del usuario:", error);
        mostrarToastNotificacion("Error al cargar la ficha del estudiante.", "error");
    }
}

window.cerrarModalUsuario = function() {
    document.getElementById('modal-info-usuario').style.display = 'none';
}

window.abrirModalCodigo = async function() {
    document.getElementById('modal-codigo-admin').style.display = 'flex';
    document.getElementById('display-codigo-actual').innerText = '...';

    try {
        const configRef = doc(db, "config", "registro");
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
            document.getElementById('display-codigo-actual').innerText = configSnap.data().codigo;
        } else {
            document.getElementById('display-codigo-actual').innerText = 'N/A';
        }
    } catch (error) {
        console.error("Error al cargar código:", error);
        mostrarToastNotificacion("Error al cargar el código.", "error");
    }
}

window.cambiarCodigoRegistro = async function() {
    const nuevoCodigo = document.getElementById('input-nuevo-codigo').value.trim();

    if (nuevoCodigo.length !== 4 || !/^\d{4}$/.test(nuevoCodigo)) {
        return mostrarToastNotificacion("El código debe ser exactamente 4 dígitos numéricos.", "aviso");
    }

    try {
        const configRef = doc(db, "config", "registro");
        await setDoc(configRef, { codigo: nuevoCodigo });

        document.getElementById('display-codigo-actual').innerText = nuevoCodigo;
        document.getElementById('input-nuevo-codigo').value = '';
        mostrarToastNotificacion("✅ Código actualizado correctamente.", "exito");

    } catch (error) {
        console.error("Error al cambiar código:", error);
        mostrarToastNotificacion("Error al guardar el nuevo código.", "error");
    }
}

window.cerrarModalCodigo = function() {
    document.getElementById('modal-codigo-admin').style.display = 'none';
    document.getElementById('input-nuevo-codigo').value = '';
}