import { doc, getDoc, setDoc, updateDoc, deleteDoc, increment, collection, getDocs, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase.config.js";

// ==========================================
// 1. VARIABLES GLOBALES DE ESTADO
// ==========================================
let escanerModalActivo = null;
let eventoEscaneandoActual = null;
let qrProcesando = false;
let eventoEditandoActual = null;
let datosEventoEditando = null;
let ponentesEnMemoria = []; 
let ponentesEdicionEnMemoria = [];

// ==========================================
// 2. MODAL: CREAR EVENTO
// ==========================================
window.agregarPonente = function() {
    const input = document.getElementById('input-ponente');
    const nombre = input.value.trim();
    if (nombre) {
        ponentesEnMemoria.push(nombre);
        input.value = "";
        renderizarPonentes();
    }
}

window.quitarPonente = function(index) {
    ponentesEnMemoria.splice(index, 1);
    renderizarPonentes();
}

window.renderizarPonentes = function() {
    const listaUI = document.getElementById('lista-ponentes');
    listaUI.innerHTML = ponentesEnMemoria.map((ponente, index) => `
        <li style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 6px 10px; border-radius: 5px; font-size: 0.85em; border: 1px solid rgba(255,255,255,0.1);">
            <span style="color: white;">🎙️ ${ponente}</span>
            <span style="color: #ff4d4d; cursor: pointer; font-weight: bold;" onclick="quitarPonente(${index})">X</span>
        </li>
    `).join('');
}

window.abrirModalCrearEvento = async function() {
    await cargarDropdownCategorias('categoria-evento');

    document.getElementById('nombre-evento').value = "";
    document.getElementById('desc-evento').value = "";
    document.getElementById('puntos-evento').value = "10";
    document.getElementById('fecha-evento').value = ""; // Nueva
    document.getElementById('hora-evento').value = "";  // Nueva
    document.getElementById('lugar-evento').value = "";
    document.getElementById('input-ponente').value = "";
    ponentesEnMemoria = []; 
    renderizarPonentes(); 
    document.getElementById('modal-crear-evento').style.display = 'flex';


}

window.cerrarModalCrearEvento = function() {
    document.getElementById('modal-crear-evento').style.display = 'none';
}

window.crearEvento = async function() {
    const nombreVal = document.getElementById('nombre-evento').value.trim();
    const puntosVal = parseInt(document.getElementById('puntos-evento').value);
    const descVal = document.getElementById('desc-evento').value.trim();
    const lugarVal = document.getElementById('lugar-evento').value.trim();
    const categoriaVal = document.getElementById('categoria-evento').value;

    const fechaVal = document.getElementById('fecha-evento').value;
    const horaVal = document.getElementById('hora-evento').value;

    if (!nombreVal || isNaN(puntosVal)) return mostrarToastNotificacion("El nombre y los puntos son obligatorios.", "aviso");

    try {
        const nuevoEventoRef = doc(collection(db, "eventos"));
        await setDoc(nuevoEventoRef, {
            nombre: nombreVal,
            descripcion: descVal,
            lugar: lugarVal,
            ponentes: ponentesEnMemoria,
            puntosRecompensa: puntosVal,
            fechaEvento: fechaVal || "",
            horaEvento: horaVal || "",  // <--- ESTA LÍNEA ES CRUCIAL
            categoria: categoriaVal,
            asistencia: 0,
            date: new Date()
        });
        
        mostrarToastNotificacion("✅ Evento creado con éxito.", "exito");
        cerrarModalCrearEvento();
        cargarPanelAdminCompleto();
    } catch (e) { 
        console.error("Error al crear el evento:", e); 
        mostrarToastNotificacion("Error de conexión al crear el evento.", "error");
    }
}

// ==========================================
// 3. MODAL: EDITAR EVENTO
// ==========================================
window.agregarPonenteEdicion = function() {
    const input = document.getElementById('editar-input-ponente');
    const nombre = input.value.trim();
    if (nombre) {
        ponentesEdicionEnMemoria.push(nombre);
        input.value = "";
        renderizarPonentesEdicion();
    }
}

window.quitarPonenteEdicion = function(index) {
    ponentesEdicionEnMemoria.splice(index, 1);
    renderizarPonentesEdicion();
}

window.renderizarPonentesEdicion = function() {
    const listaUI = document.getElementById('editar-lista-ponentes');
    listaUI.innerHTML = ponentesEdicionEnMemoria.map((ponente, index) => `
        <li style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 6px 10px; border-radius: 5px; font-size: 0.85em; border: 1px solid rgba(255,255,255,0.1);">
            <span style="color: white;">🎙️ ${ponente}</span>
            <span style="color: #ff4d4d; cursor: pointer; font-weight: bold;" onclick="quitarPonenteEdicion(${index})">X</span>
        </li>
    `).join('');
}

window.abrirModalEditarEvento = async function(idEvento) {
    eventoEditandoActual = idEvento;
    
    try {
        const eventoRef = doc(db, "eventos", idEvento);
        const eventoSnap = await getDoc(eventoRef);
        
        if (eventoSnap.exists()) {
            const data = eventoSnap.data();
            
            document.getElementById('editar-nombre-evento').value = data.nombre || "";
            document.getElementById('editar-desc-evento').value = data.descripcion || "";
            document.getElementById('editar-puntos-evento').value = data.puntosRecompensa || 10;
            document.getElementById('editar-lugar-evento').value = data.lugar || "";
            document.getElementById('editar-fecha-evento').value = data.fechaEvento || "";
            document.getElementById('editar-hora-evento').value = data.horaEvento || "";
            document.getElementById('modal-editar-evento').style.display = 'flex';
            
            // 2. Cargamos el dropdown pasando la categoría que ya tiene guardada (o vacío si no tiene)
            await cargarDropdownCategorias('editar-categoria-evento', data.categoria || "");
            
            ponentesEdicionEnMemoria = data.ponentes ? [...data.ponentes] : [];
            renderizarPonentesEdicion();
        }
    } catch(e) {
        console.error("Error al cargar evento:", e);
    }
}

window.cerrarModalEditarEvento = function() {
    document.getElementById('modal-editar-evento').style.display = 'none';
    eventoEditandoActual = null;
}

window.guardarEdicionEvento = async function() {
    if (!eventoEditandoActual) return;

    const nuevoNombre = document.getElementById('editar-nombre-evento').value.trim();
    const nuevaDesc = document.getElementById('editar-desc-evento').value.trim();
    const nuevosPuntos = parseInt(document.getElementById('editar-puntos-evento').value);
    const nuevoLugar = document.getElementById('editar-lugar-evento').value.trim();
    const nuevaCategoria = document.getElementById('editar-categoria-evento').value;
    const nuevaFecha = document.getElementById('editar-fecha-evento').value;
    const nuevaHora = document.getElementById('editar-hora-evento').value;

    if (!nuevoNombre || isNaN(nuevosPuntos)) {
        return mostrarToastNotificacion("El nombre y los puntos son obligatorios.", "aviso");
    }

    try {
        const eventoRef = doc(db, "eventos", eventoEditandoActual);
        
        // Actualizamos incluyendo horaEvento explícitamente
        await updateDoc(eventoRef, {
            nombre: nuevoNombre,
            descripcion: nuevaDesc,
            lugar: nuevoLugar,
            categoria: nuevaCategoria,
            ponentes: ponentesEdicionEnMemoria,
            puntosRecompensa: nuevosPuntos,
            fechaEvento: nuevaFecha || "",
            horaEvento: nuevaHora || ""
        });

        // ... resto de tu lógica de actualización de usuarios ...
        mostrarToastNotificacion("✅ Evento actualizado.", "exito");
        cerrarModalEditarEvento();
        cargarPanelAdminCompleto();
    } catch (error) {
        console.error("Error al editar:", error);
    }
}

// ==========================================
// MÓDULO: GESTIÓN DE CATEGORÍAS
// ==========================================

window.abrirModalCategorias = async function() {
    document.getElementById('modal-categorias-admin').style.display = 'flex';
    document.getElementById('input-nueva-categoria').value = "";
    await cargarVistaCategorias();
}

window.cerrarModalCategorias = function() {
    document.getElementById('modal-categorias-admin').style.display = 'none';
}

window.cargarVistaCategorias = async function() {
    const contenedor = document.getElementById('lista-categorias-render');
    contenedor.innerHTML = "<p style='color:white;text-align:center;'>Cargando...</p>";

    try {
        // 1. Traemos la lista maestra de categorías
        const catSnap = await getDoc(doc(db, "config", "categorias"));
        let categorias = catSnap.exists() ? (catSnap.data().lista || []) : [];

        // 2. Traemos todos los eventos para agruparlos
        const eventosSnap = await getDocs(collection(db, "eventos"));
        let eventos = [];
        eventosSnap.forEach(d => eventos.push({ id: d.id, ...d.data() }));

        let html = "";
        if (categorias.length === 0) {
            html = "<p style='color:#c4c4c4; text-align:center; font-size: 0.9em;'>Aún no hay categorías creadas.</p>";
        } else {
            // Ordenar alfabéticamente
            categorias.sort().forEach(cat => {
                const eventosDeCat = eventos.filter(e => e.categoria === cat);
                
                // Montamos la sub-lista de eventos
                let eventosHtml = eventosDeCat.map(e => `<li style="color:#c4c4c4; font-size: 0.85em; margin-left: 10px; margin-bottom: 3px;">🌿 ${e.nombre}</li>`).join('');
                if (eventosHtml === "") eventosHtml = `<li style="color:rgba(255,255,255,0.3); font-size: 0.8em; margin-left: 10px; font-style: italic;">Sin eventos asignados</li>`;

                // Montamos el bloque de la categoría (Tabla visual)
                html += `
                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="color: var(--color-primary-light); font-size: 1em;">🏷️ ${cat}</strong>
                        <button class="btn-icono-rojo" onclick="borrarCategoria('${cat}')" style="padding: 4px 10px; font-size: 0.8em; background: rgba(255, 77, 77, 0.1);">🗑️ Borrar</button>
                    </div>
                    <ul style="list-style: none; padding: 0;">
                        ${eventosHtml}
                    </ul>
                </div>`;
            });
        }
        contenedor.innerHTML = html;
    } catch (e) {
        console.error("Error cargando categorías:", e);
        contenedor.innerHTML = "<p style='color:red;'>Error al cargar.</p>";
    }
}

window.crearCategoria = async function() {
    const input = document.getElementById('input-nueva-categoria');
    const nombreCat = input.value.trim();
    
    if (!nombreCat) return mostrarToastNotificacion("Escribe un nombre para la categoría", "aviso");

    try {
        const catRef = doc(db, "config", "categorias");
        const catSnap = await getDoc(catRef);
        let lista = catSnap.exists() ? (catSnap.data().lista || []) : [];

        // Evitar duplicados
        if (lista.map(c => c.toLowerCase()).includes(nombreCat.toLowerCase())) {
            return mostrarToastNotificacion("Esa categoría ya existe.", "aviso");
        }

        lista.push(nombreCat);
        await setDoc(catRef, { lista: lista }, { merge: true });

        input.value = "";
        mostrarToastNotificacion("✅ Categoría creada", "exito");
        cargarVistaCategorias(); // Refresca la tabla del modal
    } catch (e) {
        console.error(e);
        mostrarToastNotificacion("Error de conexión.", "error");
    }
}

window.borrarCategoria = async function(nombreCat) {
    if (!confirm(`¿Seguro que quieres borrar la categoría "${nombreCat}"?\n\nLos eventos no se borrarán, pero perderán esta etiqueta.`)) return;

    try {
        // 1. Borrar de la lista maestra
        const catRef = doc(db, "config", "categorias");
        const catSnap = await getDoc(catRef);
        if (catSnap.exists()) {
            const nuevaLista = catSnap.data().lista.filter(c => c !== nombreCat);
            await updateDoc(catRef, { lista: nuevaLista });
        }

        // 2. Borrar la etiqueta de los eventos de forma silenciosa
        const eventosSnap = await getDocs(collection(db, "eventos"));
        const promesas = [];
        eventosSnap.forEach(docEv => {
            if (docEv.data().categoria === nombreCat) {
                promesas.push(updateDoc(doc(db, "eventos", docEv.id), { categoria: "" }));
            }
        });
        await Promise.all(promesas);

        mostrarToastNotificacion(`🗑️ Categoría "${nombreCat}" eliminada.`, "exito");
        cargarVistaCategorias(); // Refresca la tabla
        cargarPanelAdminCompleto(); // Refresca los eventos de fondo
    } catch (e) {
        console.error("Error al borrar categoría:", e);
        mostrarToastNotificacion("Hubo un error al borrar.", "error");
    }
}

// Función auxiliar para cargar el menú desplegable (select) al crear/editar eventos
window.cargarDropdownCategorias = async function(idSelect, valorActual = "") {
    const select = document.getElementById(idSelect);
    if (!select) return;

    try {
        const catSnap = await getDoc(doc(db, "config", "categorias"));
        const categorias = catSnap.exists() ? (catSnap.data().lista || []) : [];
        
        // Creamos la opción por defecto
        let html = `<option value="">-- Sin categoría --</option>`;
        
        // Añadimos cada categoría
        categorias.sort().forEach(c => {
            // Si la categoría coincide con la del evento, la marcamos como "selected"
            const seleccionado = (c === valorActual) ? "selected" : "";
            html += `<option value="${c}" ${seleccionado}>${c}</option>`;
        });
        
        select.innerHTML = html;
    } catch (e) {
        console.error("Error al cargar categorías en el dropdown:", e);
    }
}

// ==========================================
// 4. NUEVO DISPARADOR DIRECTO DE ASISTENCIA
// ==========================================
window.abrirModalAsistencia = async function(idEvento) {
    if (!idEvento) return;
    
    try {
        // Hacemos un fetch rápido de datos para saber el nombre y los puntos del evento
        const eventoRef = doc(db, "eventos", idEvento);
        const eventoSnap = await getDoc(eventoRef);
        
        if (eventoSnap.exists()) {
            const data = eventoSnap.data();
            datosEventoEditando = {
                id: idEvento,
                nombre: data.nombre,
                puntos: data.puntosRecompensa
            };
            
            // Abrimos la ventana directamente
            document.getElementById('modal-asistencia-evento').style.display = 'flex';
            document.getElementById('subtitulo-asistencia').innerText = datosEventoEditando.nombre;
            
            await cargarListaAsistencia();
        } else {
            mostrarToastNotificacion("El evento ya no existe.", "error");
        }
    } catch (e) {
        console.error("Error al abrir asistencia:", e);
        mostrarToastNotificacion("Fallo al leer datos del evento.", "error");
    }
}

window.cerrarModalAsistencia = function() {
    document.getElementById('modal-asistencia-evento').style.display = 'none';
    datosEventoEditando = null; // Vaciamos estado de asistencia
    
    // Al volver, refrescamos el panel de fondo para actualizar contadores
    cargarPanelAdminCompleto(); 
    mostrarUsuariosAdmin();
}

window.cargarListaAsistencia = async function() {
    const contenedor = document.getElementById('lista-asistencia-usuarios');
    contenedor.innerHTML = "<p style='color: white; text-align: center;'>Cargando estudiantes...</p>";

    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        let usuarios = [];
        querySnapshot.forEach(doc => usuarios.push({ id: doc.id, ...doc.data() }));

        usuarios.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

        let html = "";
        usuarios.forEach(user => {
            const historial = user.historial || [];
            const tieneAsistencia = historial.some(act => act.nombre === datosEventoEditando.nombre);

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 8px; margin-bottom: 5px; border: 1px solid rgba(255,255,255,0.1);">
                    <span style="color: white; font-size: 0.9em; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${user.nombre}
                    </span>
                    ${tieneAsistencia 
                        ? `<button class="btn-icono-rojo" onclick="quitarAsistenciaRapida('${user.id}')" style="padding: 4px 10px; font-size: 0.85em; background: rgba(255, 77, 77, 0.1);">❌ Quitar</button>`
                        : `<button class="btn-icono-verde" onclick="ponerAsistenciaRapida('${user.id}')" style="padding: 4px 10px; font-size: 0.85em; background: rgba(98, 197, 102, 0.1);">✅ Añadir</button>`
                    }
                </div>
            `;
        });

        contenedor.innerHTML = html;
    } catch (e) {
        console.error("Error al cargar asistencia:", e);
        contenedor.innerHTML = "<p style='color: #ff4d4d; text-align: center;'>Error al cargar estudiantes.</p>";
    }
}

window.ponerAsistenciaRapida = async function(idUsuario) {
    const res = await procesarFichaje(idUsuario, datosEventoEditando.nombre, datosEventoEditando.puntos);
    if (res.exito) cargarListaAsistencia();
    else mostrarToastNotificacion(res.mensaje, "error");
}

window.quitarAsistenciaRapida = async function(idUsuario) {
    const res = await procesarBorradoFichaje(idUsuario, datosEventoEditando.nombre);
    if (res.exito) cargarListaAsistencia();
    else mostrarToastNotificacion(res.mensaje, "error");
}

// ==========================================
// 5. MOTOR BASE: FICHAJES Y BORRADOS
// ==========================================
window.procesarFichaje = async function(idUsuario, nombreEvento, puntosASumar) {
    if (!idUsuario) return { exito: false, tipo: "vacio", mensaje: "No se ha seleccionado ningún estudiante." };

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
            historial: arrayUnion({ nombre: nombreEvento, puntos: puntosASumar, fecha: new Date() })
        });

        const eventosSnapshot = await getDocs(collection(db, "eventos"));
        const promesasAsistencia = [];
        eventosSnapshot.forEach(eventoDoc => {
            if (eventoDoc.data().nombre === nombreEvento) {
                promesasAsistencia.push(updateDoc(doc(db, "eventos", eventoDoc.id), { asistencia: increment(1) }));
            }
        });
        await Promise.all(promesasAsistencia);

        return { exito: true, tipo: "ok", mensaje: `¡+${puntosASumar} pts añadidos correctamente!` };

    } catch (e) {
        console.error("Error en la base de datos:", e);
        return { exito: false, tipo: "error", mensaje: "Error de conexión con la base de datos." };
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
        if (!tieneElEvento) return { exito: false, mensaje: "El usuario no tiene este evento en su historial" };

        const eventoData = historialActual.find(act => act.nombre === nombreEvento);
        const puntosARestar = eventoData.puntos;
        const nuevoHistorial = historialActual.filter(act => act.nombre !== nombreEvento);

        await updateDoc(userRef, {
            historial: nuevoHistorial,
            puntosTotales: increment(-puntosARestar)
        });

        const eventosSnapshot = await getDocs(collection(db, "eventos"));
        const promesasAsistencia = [];
        eventosSnapshot.forEach(eventoDoc => {
            if (eventoDoc.data().nombre === nombreEvento) {
                promesasAsistencia.push(updateDoc(doc(db, "eventos", eventoDoc.id), { asistencia: increment(-1) }));
            }
        });
        await Promise.all(promesasAsistencia);

        return { exito: true, mensaje: `Evento "${nombreEvento}" borrado. -${puntosARestar} pts.` };

    } catch (error) {
        console.error("Error en el motor de borrado:", error);
        return { exito: false, mensaje: "Error de conexión." };
    }
}

// ==========================================
// 6. RENDERIZADO DEL PANEL PRINCIPAL
// ==========================================
// ==========================================
// 6. RENDERIZADO DEL PANEL PRINCIPAL
// ==========================================

// Memoria caché para recordar qué tarjetas están abiertas al recargar datos
const eventosExpandidos = new Set();

window.cargarPanelAdminCompleto = async function() {
    const contenedorEventos = document.getElementById('lista-eventos-admin');
    if (!contenedorEventos) return;

    try {
        const snapshotEventos = await getDocs(collection(db, "eventos"));
        let html = "";

        snapshotEventos.forEach((docEvento) => {
            const evento = docEvento.data();
            const idEvento = docEvento.id;
            
            // --- Lógica de Notificaciones ---
            const estaNotificado = evento.notificar === true;
            const textoNotificar = estaNotificado ? "🔕 Ocultar" : "🔔 Notificar";
            const bgNotificar = estaNotificado ? "rgba(98, 197, 102, 0.2)" : "transparent";
            const colorNotificar = estaNotificado ? "var(--color-primary-dark)" : "#c4c4c4";

            // --- Lógica de Desplegable (Acordeón) ---
            const estaAbierto = eventosExpandidos.has(idEvento);
            const displayControles = estaAbierto ? "flex" : "none";
            const transformFlecha = estaAbierto ? "rotate(180deg)" : "rotate(0deg)";
            const colorFlecha = estaAbierto ? "var(--color-primary-dark)" : "var(--color-text-muted)";

            html += `
                <div class="fila-usuario" style="flex-direction: column; padding-bottom: 5px;">
                    <div style="width: 100%;">
                        <!-- CABECERA DEL EVENTO (Siempre visible) -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                            <div style="flex: 1; min-width: 0;">
                                <strong style="color: var(--color-primary-dark); font-size: 1em; word-break: break-word; display: block; line-height: 1.3;">
                                    ${evento.nombre || "Sin nombre"}
                                </strong>
                                <p style="color: #c4c4c4; font-size: 0.75em; margin-top: 3px;">
                                    ${evento.fechaEvento ? `📅 ${formatearFecha(evento.fechaEvento)}` : '📅 Sin fecha'}
                                </p>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; max-width: 90px;">
                                <div style="display: flex; gap: 4px;">
                                    <span class="tag-puntos" style="font-size: 0.75em;">${evento.puntosRecompensa || 0} Pts</span>
                                    <span class="tag-puntos" style="font-size: 0.75em;">${evento.asistencia || 0} 👥</span>
                                </div>
                                ${evento.categoria ? `<span class="tag-puntos" style="background: rgba(98, 197, 102, 0.2); color: var(--color-primary-light); font-size: 0.65em; padding: 2px 6px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;">🏷️ ${evento.categoria}</span>` : ''}                            
                            </div>
                        </div>

                        <!-- FLECHA DESPLEGABLE -->
                        <div style="display: flex; justify-content: flex-start; margin-top: 0px;">
                            <button id="flecha-${idEvento}" onclick="toggleControlesEvento('${idEvento}')" style="background: transparent; border: none; color: ${colorFlecha}; font-size: 0.8em; cursor: pointer; padding: 4px 8px; transform: ${transformFlecha}; transition: transform 0.3s ease, color 0.3s ease;">
                                ▼
                            </button>
                        </div>

                        <!-- CONTROLES OCULTOS -->
                        <div id="controles-${idEvento}" style="display: ${displayControles}; flex-direction: column; margin-top: 5px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                            <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                                <button class="btn-icono-verde" onclick="abrirModalEditarEvento('${idEvento}')" style="flex: 1; padding: 5px; font-size: 0.85em;">✏️ Editar</button>
                                <button class="btn-icono-verde" onclick="abrirCamaraModal('${idEvento}')" style="flex: 1; padding: 5px; font-size: 0.85em;">📷 QR</button>
                                <button class="btn-icono-rojo" onclick="borrarEvento('${idEvento}')" style="flex: 1; padding: 5px; font-size: 0.85em;">🗑️ Borrar</button>
                            </div>

                            <div style="display: flex; gap: 6px; margin-bottom: 4px;">
                                <button class="btn-puntos" onclick="abrirModalAsistencia('${idEvento}')" style="flex: 1; padding: 6px; font-size: 0.85em; background: transparent; border: 1px solid var(--color-primary-light); color: var(--color-primary-light);">
                                    👥 Asistencia
                                </button>
                                <button class="btn-puntos" onclick="toggleNotificacion('${idEvento}', ${estaNotificado})" style="flex: 1; padding: 6px; font-size: 0.85em; background: ${bgNotificar}; border: 1px solid ${colorNotificar}; color: ${colorNotificar};">
                                    ${textoNotificar}
                                </button>
                            </div>
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

// FUNCIÓN Cambia el estado de notificación de un evento
window.toggleNotificacion = async function(idEvento, estadoActual) {
    try {
        const eventoRef = doc(db, "eventos", idEvento);
        // Enviamos a Firestore el valor opuesto al actual
        await updateDoc(eventoRef, { notificar: !estadoActual });
        
        mostrarToastNotificacion(!estadoActual ? "🔔 Notificación activada para todos" : "🔕 Notificación ocultada", "exito");
        
        // Recargamos silenciosamente el panel para que cambie el color del botón
        cargarPanelAdminCompleto();
    } catch (error) {
        console.error("Error al cambiar notificación:", error);
        mostrarToastNotificacion("Error al actualizar estado.", "error");
    }
}

window.toggleControlesEvento = function(idEvento) {
    const controles = document.getElementById(`controles-${idEvento}`);
    const flecha = document.getElementById(`flecha-${idEvento}`);
    
    if (controles.style.display === "none") {
        // Expandir
        controles.style.display = "flex";
        flecha.style.transform = "rotate(180deg)";
        flecha.style.color = "var(--color-primary-dark)"; // Se ilumina al abrir
        eventosExpandidos.add(idEvento); // Lo guardamos en memoria
    } else {
        // Contraer
        controles.style.display = "none";
        flecha.style.transform = "rotate(0deg)";
        flecha.style.color = "var(--color-text-muted)"; // Se apaga al cerrar
        eventosExpandidos.delete(idEvento); // Lo borramos de memoria
    }
}

window.mostrarUsuariosAdmin = async function() {
    const contenedor = document.getElementById('lista-usuarios');
    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        let html = "";

        querySnapshot.forEach((usuarioDoc) => {
            const datos = usuarioDoc.data();
            html += `
                <div class="fila-usuario" style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: white; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                        <strong>${datos.nombre || "Estudiante"}</strong>
                    </span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="btn-puntos" style="cursor: default; pointer-events: none; font-size: 0.8em; padding: 5px 12px;">
                            ${datos.puntosTotales || 0} pts
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
        console.error("Error al mostrar usuarios:", e);
    }
}

// ==========================================
// 7. ACCIONES EXTRAS Y UTILIDADES
// ==========================================
window.borrarEvento = async function(idEvento) {
    try {
        const eventoRef = doc(db, "eventos", idEvento);
        const eventoSnap = await getDoc(eventoRef);
        if (!eventoSnap.exists()) return mostrarToastNotificacion("El evento ya fue borrado.", "aviso");
        
        const nombreEvento = eventoSnap.data().nombre;
        if (confirm(`¿Estás seguro de eliminar el evento "${nombreEvento}"?\n\nSe restarán los puntos a los estudiantes.`)) {
            await deleteDoc(eventoRef);
            const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
            const promesasDeBorrado = [];

            usuariosSnapshot.forEach((usuarioDoc) => {
                const historial = usuarioDoc.data().historial || [];
                if (historial.some(act => act.nombre === nombreEvento)) {
                    promesasDeBorrado.push(procesarBorradoFichaje(usuarioDoc.id, nombreEvento, historial));
                }
            });

            await Promise.all(promesasDeBorrado);
            alert("✅ Evento borrado. Historiales actualizados.");
            cargarPanelAdminCompleto();
            mostrarUsuariosAdmin();
        }
    } catch (error) {
        console.error("Error al borrar evento:", error);
    }
}

window.borrarFichajeManual = async function(idUsuario, nombreEvento) {
    if (!confirm(`¿Seguro que quieres quitar el evento "${nombreEvento}" de este estudiante?`)) return;

    const resultado = await procesarBorradoFichaje(idUsuario, nombreEvento);
    if (resultado.exito) {
        mostrarToastNotificacion(resultado.mensaje, "exito");
        abrirModalUsuario(idUsuario);
        mostrarUsuariosAdmin();
        cargarPanelAdminCompleto();
    } else {
        mostrarToastNotificacion(resultado.mensaje, "error");
    }
}

window.abrirCamaraModal = async function(idEvento) {
    try {
        const eventoRef = doc(db, "eventos", idEvento);
        const eventoSnap = await getDoc(eventoRef);
        
        if (!eventoSnap.exists()) return mostrarToastNotificacion("El evento ya no existe.", "error");
        
        const data = eventoSnap.data();
        eventoEscaneandoActual = { idEvento: idEvento, nombreEvento: data.nombre, puntosEvento: data.puntosRecompensa };
        
        document.getElementById('titulo-modal-escaner').innerText = `Escaneando:\n${data.nombre}`;
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
    } catch (e) {
        console.error("Error al abrir cámara:", e);
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
                html = `<tr><td colspan="2" style="text-align: center; padding: 15px; color: rgba(255,255,255,0.4); font-style: italic;">Aún no ha participado</td></tr>`;
            } else {
                [...historial].reverse().forEach(act => {
                    html += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <td style="padding: 8px 0; color: #c4c4c4;">🌿 ${act.nombre}</td>
                            <td style="text-align: right; padding: 8px 0; color: var(--color-primary-light); font-weight: bold; display: flex; justify-content: flex-end; align-items: center; gap: 10px;">
                                +${act.puntos}
                                <button onclick="borrarFichajeManual('${idUsuario}', '${act.nombre}')" style="background: transparent; border: none; color: #ff4d4d; cursor: pointer; font-size: 1.1em;">🗑️</button>
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
        console.error("Error al cargar ficha:", error);
    }
}

window.cerrarModalUsuario = function() {
    document.getElementById('modal-info-usuario').style.display = 'none';
}

window.abrirModalCodigo = async function() {
    document.getElementById('modal-codigo-admin').style.display = 'flex';
    document.getElementById('display-codigo-actual').innerText = '...';

    try {
        const configSnap = await getDoc(doc(db, "config", "registro"));
        document.getElementById('display-codigo-actual').innerText = configSnap.exists() ? configSnap.data().codigo : 'N/A';
    } catch (error) {
        console.error("Error al cargar código:", error);
    }
}

window.cambiarCodigoRegistro = async function() {
    const nuevoCodigo = document.getElementById('input-nuevo-codigo').value.trim();
    if (nuevoCodigo.length !== 4 || !/^\d{4}$/.test(nuevoCodigo)) {
        return mostrarToastNotificacion("Debe ser de 4 dígitos numéricos.", "aviso");
    }

    try {
        await setDoc(doc(db, "config", "registro"), { codigo: nuevoCodigo });
        document.getElementById('display-codigo-actual').innerText = nuevoCodigo;
        document.getElementById('input-nuevo-codigo').value = '';
        mostrarToastNotificacion("✅ Código actualizado.", "exito");
    } catch (error) {
        console.error("Error al cambiar código:", error);
    }
}

window.cerrarModalCodigo = function() {
    document.getElementById('modal-codigo-admin').style.display = 'none';
    document.getElementById('input-nuevo-codigo').value = '';
}

window.exportarExcel = async function() {
    mostrarToastNotificacion("Generando Excel...", "aviso");

    try {
        const [snapshotEventos, snapshotUsuarios] = await Promise.all([
            getDocs(collection(db, "eventos")),
            getDocs(collection(db, "usuarios"))
        ]);

        const eventos = [];
        snapshotEventos.forEach(d => eventos.push({ id: d.id, ...d.data() }));
        const usuarios = [];
        snapshotUsuarios.forEach(d => usuarios.push({ id: d.id, ...d.data() }));

        usuarios.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

        const cabecera = ["Nombre", "Email", "Fecha Registro", "Puntos Totales"];
        eventos.forEach(ev => {
            cabecera.push(`${ev.nombre}`); // Solo 1 columna por evento
        });

        const filas = usuarios.map(usuario => {
            const historialNombres = (usuario.historial || []).map(h => h.nombre);
            let fechaRegistro = "";
            if (usuario.fechaRegistro) {
                const fecha = usuario.fechaRegistro.toDate ? usuario.fechaRegistro.toDate() : new Date(usuario.fechaRegistro);
                fechaRegistro = fecha.toLocaleDateString('es-ES');
            }

            const fila = [usuario.nombre || "", usuario.email || "", fechaRegistro, usuario.puntosTotales || 0];
            eventos.forEach(ev => {
                fila.push(historialNombres.includes(ev.nombre) ? "Sí" : "No"); // Solo guardamos Asistencia
            });
            return fila;
        });

        const fecha = new Date();
        const filaEventos = ["", "", "", ""];
        eventos.forEach(ev => { filaEventos.push(`👥 ${ev.asistencia || 0} asistentes`); });

        const datosHoja = [
            [`Informe Carné Ecotópico`],
            [`Fecha: ${fecha.toLocaleDateString('es-ES')} a las ${fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`],
            [`Total de ecotópicos: ${usuarios.length} | Total de eventos: ${eventos.length}`],
            [],
            cabecera,
            filaEventos,
            ...filas
        ];

        const libro = XLSX.utils.book_new();
        const hoja = XLSX.utils.aoa_to_sheet(datosHoja);
        hoja['!cols'] = cabecera.map((_, i) => ({ wch: i === 0 ? 20 : i === 1 ? 25 : i === 2 ? 15 : 12 }));
        XLSX.utils.book_append_sheet(libro, hoja, "Ecotópicos");
        XLSX.writeFile(libro, `ecotopia_informe_${fecha.toISOString().slice(0,10)}.xlsx`);
        
        mostrarToastNotificacion("✅ Excel generado.", "exito");
    } catch (error) {
        console.error("Error al exportar:", error);
        mostrarToastNotificacion("Error al exportar.", "error");
    }
}

window.formatearFecha = function(fechaString) {
    if (!fechaString) return "Sin fecha";
    if (fechaString.includes('T')) {
        const [fecha, hora] = fechaString.split('T');
        const [anio, mes, dia] = fecha.split('-');
        return `${dia}/${mes}/${anio} a las ${hora}`;
    }
    const [anio, mes, dia] = fechaString.split('-');
    return `${dia}/${mes}/${anio}`;
}
// ==========================================
// MÓDULO: ESTADÍSTICAS
// ==========================================
window.abrirModalEstadisticas = async function() {
    document.getElementById('modal-estadisticas').style.display = 'flex';
    document.getElementById('estadisticas-subtitulo').innerText = 'Cargando datos...';
    document.getElementById('estadisticas-resumen').innerHTML = '';
    document.getElementById('tbody-eventos-stats').innerHTML = '';

    try {
        // Una sola ronda de lecturas en paralelo (más eficiente)
        const [snapshotUsuarios, snapshotEventos] = await Promise.all([
            getDocs(collection(db, "usuarios")),
            getDocs(collection(db, "eventos"))
        ]);

        const usuarios = [];
        snapshotUsuarios.forEach(d => usuarios.push({ id: d.id, ...d.data() }));

        const eventos = [];
        snapshotEventos.forEach(d => eventos.push({ id: d.id, ...d.data() }));

        // Guardamos para reutilizar en la tabla de asistencia
        _datosUsuariosStats = usuarios;
        _datosEventosStats = eventos;

        const totalUsuarios = usuarios.length;
        const totalEventos = eventos.length;

        // --- RESUMEN GENERAL ---
        const totalPuntos = usuarios.reduce((sum, u) => sum + (u.puntosTotales || 0), 0);
        const mediaPuntos = totalUsuarios > 0 ? (totalPuntos / totalUsuarios).toFixed(1) : 0;
        const totalFichajes = usuarios.reduce((sum, u) => sum + (u.historial || []).length, 0);

        // El ecotópico más activo
        const masActivo = [...usuarios].sort((a, b) => (b.puntosTotales || 0) - (a.puntosTotales || 0))[0];

        document.getElementById('estadisticas-subtitulo').innerText =
            `${totalUsuarios} ecotópicos · ${totalEventos} actividades`;

        document.getElementById('estadisticas-resumen').innerHTML = `
            ${tarjetaStat('👥', 'Total ecotópicos', totalUsuarios)}
            ${tarjetaStat('🌿', 'Total actividades', totalEventos)}
            ${tarjetaStat('⚡', 'Media de puntos', mediaPuntos + ' pts')}
            ${tarjetaStat('📋', 'Fichajes totales', totalFichajes)}
            ${masActivo ? tarjetaStat('🏆', 'Más puntos', masActivo.nombre.split(' ')[0] + ': ' + (masActivo.puntosTotales || 0) + ' pts') : ''}
        `;

        // --- TABLA POR EVENTO ---
        // Para cada evento: asistentes reales + cuántos lo tenían como objetivo
        const tbody = document.getElementById('tbody-eventos-stats');
        let htmlFilas = '';

        // Ordenar eventos por asistencia descendente
        const eventosOrdenados = [...eventos].sort((a, b) => (b.asistencia || 0) - (a.asistencia || 0));

        // (Dentro de window.abrirModalEstadisticas, reemplaza el ciclo eventosOrdenados.forEach...)
        eventosOrdenados.forEach(evento => {
            const asistentes = evento.asistencia || 0;
            const porcentaje = totalUsuarios > 0
                ? Math.round((asistentes / totalUsuarios) * 100)
                : 0;

            const colorBarra = porcentaje >= 75 ? '#62c566'
                             : porcentaje >= 40 ? '#ffcc00'
                             : '#ff6b6b';

            htmlFilas += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <td style="padding: 8px 4px; color: white; max-width: 150px; word-break: break-word;">
                        ${evento.nombre || 'Sin nombre'}
                        ${evento.categoria ? `<br><span style="color: var(--color-primary-light); font-size: 0.75em;">🏷️ ${evento.categoria}</span>` : ''}
                    </td>
                    <td style="text-align: center; padding: 8px 4px; font-weight: bold; color: var(--color-primary-light);">
                        ${asistentes}
                    </td>
                    <td style="text-align: center; padding: 8px 4px;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
                            <span style="font-weight: bold; color: ${colorBarra};">${porcentaje}%</span>
                            <div style="width: 60px; height: 5px; background: rgba(255,255,255,0.15); border-radius: 3px; overflow: hidden;">
                                <div style="width: ${porcentaje}%; height: 100%; background: ${colorBarra}; border-radius: 3px;"></div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = htmlFilas || `<tr><td colspan="3" style="text-align:center; color:#c4c4c4; padding: 20px;">No hay eventos aún.</td></tr>`;

        tbody.innerHTML = htmlFilas || `<tr><td colspan="4" style="text-align:center; color:#c4c4c4; padding: 20px;">No hay eventos aún.</td></tr>`;

    } catch (e) {
        console.error("Error al cargar estadísticas:", e);
        document.getElementById('estadisticas-subtitulo').innerText = 'Error al cargar datos.';
    }
}

window.cerrarModalEstadisticas = function() {
    document.getElementById('modal-estadisticas').style.display = 'none';
}

// Función auxiliar: genera una tarjetita de stat
function tarjetaStat(icono, etiqueta, valor) {
    return `
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px; text-align: center;">
            <div style="font-size: 1.4em; margin-bottom: 4px;">${icono}</div>
            <div style="color: var(--color-primary-light); font-weight: bold; font-size: 1em;">${valor}</div>
            <div style="color: #c4c4c4; font-size: 0.72em; margin-top: 2px;">${etiqueta}</div>
        </div>
    `;
}

// ==========================================
// MÓDULO: TABLA DE ASISTENCIA
// ==========================================

// Guardamos los datos cargados en estadísticas para reutilizarlos
let _datosUsuariosStats = [];
let _datosEventosStats = [];

window.abrirTablaAsistencia = function() {
    if (_datosUsuariosStats.length === 0) {
        return mostrarToastNotificacion("Primero carga las estadísticas.", "aviso");
    }

    const usuarios = [..._datosUsuariosStats].sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "")
    );
    const eventos = [..._datosEventosStats].sort((a, b) =>
        (b.asistencia || 0) - (a.asistencia || 0)
    );

    // --- CABECERA ---
    // Primera columna: nombre. Resto: un evento por columna
    let htmlCabecera = `
        <tr>
            <th style="text-align: left; padding: 8px 10px; background: rgba(0,0,0,0.4); color: #a4f5a7; position: sticky; left: 0; z-index: 2; min-width: 130px; border-bottom: 2px solid #62c566;">
                Ecotópico
            </th>
            <th style="text-align: center; padding: 8px 6px; background: rgba(0,0,0,0.4); color: #a4f5a7; min-width: 50px; border-bottom: 2px solid #62c566;">
                Pts
            </th>
    `;
    eventos.forEach(ev => {
            htmlCabecera += `
                <th style="text-align: center; padding: 6px 8px; background: rgba(0,0,0,0.4); color: #a4f5a7; min-width: 100px; max-width: 130px; border-bottom: 2px solid #62c566; font-weight: normal; font-size: 0.85em; word-break: break-word; vertical-align: bottom;">
                    ${ev.nombre || 'Sin nombre'}
                </th>
            `;
        });
    htmlCabecera += '</tr>';
    document.getElementById('thead-asistencia').innerHTML = htmlCabecera;

    // --- FILAS ---
    let htmlFilas = '';
    usuarios.forEach((usuario, i) => {
        const historialNombres = (usuario.historial || []).map(h => h.nombre);
        const objetivosIds = usuario.objetivosId || [];
        const bgFila = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';

        let fila = `
            <tr style="background: ${bgFila};">
                <td style="padding: 7px 10px; color: white; font-weight: bold; position: sticky; left: 0; background: #0d1a0e; z-index: 1; border-bottom: 1px solid rgba(255,255,255,0.06); white-space: nowrap;">
                    ${usuario.nombre || 'Sin nombre'}
                </td>
                <td style="text-align: center; padding: 7px 4px; color: var(--color-primary-light); font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.06);">
                    ${usuario.puntosTotales || 0}
                </td>
        `;

        // (Dentro de window.abrirTablaAsistencia, en el ciclo de filas de eventos...)
        eventos.forEach(ev => {
            const asistio = historialNombres.includes(ev.nombre);

            let bg, borde, icono;
            if (asistio) {
                bg = 'rgba(98, 197, 102, 0.25)';
                borde = '1px solid rgba(98,197,102,0.4)';
                icono = '✅';
            } else {
                bg = 'rgba(255, 77, 77, 0.18)';
                borde = '1px solid rgba(255,77,77,0.3)';
                icono = '❌';
            }

            fila += `
                <td style="text-align: center; padding: 7px 4px; background: ${bg}; border: ${borde}; font-size: 0.9em;">
                    ${icono}
                </td>
            `;
        });

        fila += '</tr>';
        htmlFilas += fila;
    });

    document.getElementById('tbody-asistencia').innerHTML = htmlFilas;
    document.getElementById('modal-tabla-asistencia').style.display = 'flex';
}

window.cerrarTablaAsistencia = function() {
    document.getElementById('modal-tabla-asistencia').style.display = 'none';
}