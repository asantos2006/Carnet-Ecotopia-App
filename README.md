# 🌿 Carnet Ecotopía App

Bienvenido al repositorio oficial del **Carnet Ecotopía**, una aplicación web diseñada para gestionar la participación, asistencia y recompensas de los estudiantes en actividades medioambientales.

## 🚀 Características Principales

### Para el Estudiante (Usuario)
* **Autenticación Segura:** Sistema de registro e inicio de sesión conectados en tiempo real con Firebase[cite: 1].
* **Carné Digital Integrado:** Generación automática de un código QR único por estudiante para una identificación rápida y sin contacto[cite: 1].
* **Seguimiento de Progreso:** Visualización del puntaje acumulado y un historial detallado con las actividades en las que se ha participado[cite: 1].

### Para la Asociación (Administrador)
* **Panel de Control Protegido:** Acceso exclusivo y asegurado para administradores mediante verificación de estado en tiempo real[cite: 1, 3].
* **Escáner QR Integrado:** Uso de la cámara del dispositivo móvil u ordenador para escanear el carné de los estudiantes y agilizar el fichaje[cite: 1, 2].
* **Gestión de Eventos:** Creación de nuevas actividades ambientales asignando su nombre y los puntos de recompensa correspondientes[cite: 1, 2].
* **Asignación de Puntos:** Sistema para registrar la asistencia de los estudiantes y actualizar su información en la nube al instante[cite: 1].
* **Directorio de Estudiantes:** Visor general de todos los voluntarios registrados con sus puntuaciones totales actualizadas[cite: 1, 2].

## 🛠️ Tecnologías Utilizadas

Este proyecto se ha desarrollado utilizando tecnologías web estándar y servicios en la nube, manteniendo una arquitectura ligera:

* **Estructura y Lógica:** HTML5, CSS3, JavaScript (Vanilla ES6)[cite: 1, 2, 3].
* **Diseño UI:** Estilo *Glassmorphism* (efecto cristal esmerilado) adaptado a dispositivos móviles para una experiencia moderna e inmersiva[cite: 2, 3].
* **Backend y Base de Datos (BaaS):** Firebase Authentication y Cloud Firestore[cite: 1].
* **Herramientas de Códigos QR:** 
  * `html5-qrcode` para la lectura mediante cámara en el panel de administrador[cite: 1, 2].
  * Generador de códigos QR en la ventana de perfil de usuario[cite: 1].

## ⚙️ Despliegue y Uso

Al estar basado en Vanilla JS y Firebase, el proyecto no requiere compilación local.

1. Clona este repositorio: `git clone https://github.com/asantos2006/Carnet-Ecotopia-App.git`
2. Sirve los archivos a través de un servidor local (como *Live Server* en VS Code) para probarlo en tu entorno de desarrollo.
3. **Nota sobre la cámara:** Por restricciones de seguridad de los navegadores, la función del escáner QR requiere que la aplicación esté alojada en un servidor seguro (`HTTPS`), como el que proporciona Firebase Hosting.

---
*Desarrollado con 💚 para impulsar la participación medioambiental.*
