# Gestor Financiero Web

Este proyecto es una aplicación web integral para la gestión de finanzas personales. Permite a los usuarios rastrear ingresos y gastos, crear presupuestos, proyectar el flujo de caja y administrar sus datos financieros de forma segura.

## Funcionalidades Principales

*   **Autenticación de Usuarios:** Inicio de sesión seguro mediante correo electrónico y contraseña.
*   **Gestión de Ingresos y Gastos:**
    *   Registro detallado de ingresos y gastos.
    *   Soporte para diversas frecuencias (único, mensual, semanal, quincenal).
    *   Categorización de gastos (Fijos y Variables) y posibilidad de añadir/eliminar categorías.
    *   Opción de marcar ingresos como reembolsos y vincularlos a categorías de gasto específicas.
*   **Presupuestos:**
    *   Definición de presupuestos mensuales para diferentes categorías de gastos.
    *   Visualización de un resumen comparativo entre el presupuesto y los gastos reales del mes.
*   **Flujo de Caja:**
    *   Cálculo y presentación de una tabla detallada con la proyección del flujo de caja.
    *   Visualización gráfica del flujo de caja (saldo final, ingresos, gastos, flujo neto) mediante Chart.js.
    *   Ajuste de la periodicidad del análisis (mensual o semanal) y duración.
*   **Gestión de Datos con Firebase:**
    *   Almacenamiento de datos financieros en Firebase Realtime Database.
    *   Sistema de versiones (backups) para los datos, permitiendo cargar estados anteriores o el más reciente.
    *   Registro detallado de cambios (log) cada vez que se guarda una nueva versión.
*   **Seguimiento de Pagos:** Funcionalidad para marcar gastos programados como pagados en un período específico (mensual/semanal).
*   **Baby Steps de Dave Ramsey:** Herramienta para seguir y marcar el progreso en los "Baby Steps" para la libertad financiera.
*   **Recordatorios:** Lista de tareas pendientes y completadas para gestionar recordatorios financieros.
*   **Tasa de Cambio USD/CLP:** Obtención automática de la tasa de cambio USD/CLP desde CoinGecko para fines informativos.
*   **Validación de Datos:** Mecanismos para asegurar la integridad de los datos, como la validación de caracteres no permitidos en claves de Firebase.

## Stack Tecnológico

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
*   **Base de Datos:** Firebase Realtime Database
*   **Autenticación:** Firebase Authentication
*   **Gráficos:** Chart.js
*   **APIs Externas:** CoinGecko API (para la tasa de cambio USD/CLP)

## Estructura del Proyecto

El proyecto se organiza de la siguiente manera:

*   `index.html`: Es el archivo HTML principal que estructura la página web. Contiene todos los elementos de la interfaz de usuario.
*   `style.css`: Contiene todas las reglas de CSS para dar estilo a la aplicación, incluyendo el diseño responsive.
*   `app.js`: Es el corazón de la aplicación. Este archivo JavaScript maneja toda la lógica del frontend, incluyendo:
    *   Interacción con el DOM (manipulación de elementos HTML).
    *   Gestión de eventos (clics de botones, cambios en formularios).
    *   Lógica de autenticación de usuarios.
    *   Comunicación con Firebase (lectura y escritura de datos).
    *   Cálculos financieros (flujo de caja, presupuestos).
    *   Renderizado dinámico de tablas y otros componentes.
    *   Integración con Chart.js para los gráficos.
    *   Llamadas a la API de CoinGecko.
*   `config.js`: Almacena la configuración de Firebase necesaria para conectar la aplicación con los servicios de Firebase (apiKey, authDomain, databaseURL, etc.). **Importante:** Este archivo contiene información sensible y debe ser configurado correctamente para que la aplicación funcione.
*   `README.md`: Este archivo, con la descripción del proyecto.

## Configuración y Uso

Para ejecutar esta aplicación localmente, sigue estos pasos:

1.  **Clonar el Repositorio (o descargar los archivos):**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd <NOMBRE_DEL_DIRECTORIO>
    ```
    Si has descargado los archivos como un ZIP, extráelos en una carpeta.

2.  **Configurar Firebase:**
    *   Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
    *   En la configuración de tu proyecto Firebase, añade una nueva aplicación web.
    *   Copia el objeto de configuración de Firebase (que incluye `apiKey`, `authDomain`, `databaseURL`, etc.).
    *   Pega esta configuración en el archivo `config.js`, reemplazando el objeto `firebaseConfig` existente.
    *   Habilita **Firebase Authentication** con el proveedor "Correo electrónico/Contraseña".
    *   Configura **Firebase Realtime Database**. Puedes empezar en modo de prueba o definir reglas de seguridad adecuadas. La estructura de datos esperada por la aplicación se crea dinámicamente bajo rutas de usuario específicas (ver sección "Gestión de Datos").

3.  **Abrir la Aplicación:**
    *   Simplemente abre el archivo `index.html` en tu navegador web preferido.

4.  **Uso:**
    *   **Registro/Inicio de Sesión:** La primera vez, necesitarás que un usuario sea creado en Firebase Authentication, o modificar el código para permitir el registro si la aplicación no lo incluye directamente en la UI (el código actual se enfoca en el login, asumiendo que los usuarios ya existen o son gestionados por un administrador en Firebase). El mapeo de UIDs de Firebase a sub‑rutas específicas (`SS`, `JOSE`, `PAPAS`, etc.) ahora se realiza en `config.js`. Modifica el objeto `USER_PATHS` allí para que coincida con tus usuarios.
    *   **Navegación:** Utiliza las pestañas para acceder a las diferentes funcionalidades (Gastos, Ingresos, Flujo de Caja, etc.).
    *   **Guardar Cambios:** Cualquier modificación en los datos (ingresos, gastos, ajustes) se puede guardar como una nueva versión. Esto crea un backup con fecha y hora en Firebase.

## Gestión de Datos

La aplicación utiliza Firebase Realtime Database para almacenar todos los datos financieros.

*   **Estructura de Datos Específica por Usuario:**
    *   Los datos de cada "grupo" o "perfil" de usuario (ej. "SS", "JOSE", "PAPAS") se almacenan bajo una ruta específica dentro de `/users/`. Por ejemplo, los datos del perfil "SS" estarían en `/users/SS/`.
    *   El mapeo de UIDs a estas sub‑rutas se define en el objeto `USER_PATHS` dentro de `config.js` (por ejemplo, `POurDKWezHXAsAQ9v86zT2KIHNH2` se mapea a `SS`). Esto permite que diferentes usuarios sean dirigidos al mismo conjunto de datos si comparten la misma sub-ruta.

*   **Versiones (Backups):**
    *   Cada vez que se guardan los cambios, la aplicación crea un nuevo "backup" (una instantánea completa de los datos) bajo la ruta `/users/<USER_SUBPATH>/backups/backup_YYYYMMDDTHHMMSS`.
    *   Esto permite a los usuarios cargar versiones anteriores de sus datos o la más reciente disponible.

*   **Log de Cambios:**
    *   Junto con cada versión guardada, se actualiza un log de cambios (`change_log`) que reside dentro del objeto de datos del backup.
    *   Este log registra qué usuario (basado en el mapeo de email) guardó la versión, cuándo, y un resumen detallado de las modificaciones realizadas en comparación con la versión anterior.

## Notas Adicionales

*   **Tasa de Cambio USD/CLP:** La aplicación obtiene la tasa de cambio entre USD y CLP de forma automática desde la API de CoinGecko. Esta tasa se muestra en la pestaña de "Ajustes" y es solo para fines informativos, no se almacena persistente con los datos del usuario en Firebase.
*   **Validación de Nombres/Claves:** Para asegurar la compatibilidad con Firebase Realtime Database, los nombres de ingresos, gastos y categorías no deben contener caracteres prohibidos por Firebase para las claves (ej: `.`, `$`, `#`, `[`, `]`, `/`). La aplicación incluye validaciones para prevenir el guardado de datos con estos caracteres en nombres que podrían ser usados como claves.
