Implementé la tarea 004 en las ocho pantallas de administración. Ahora usan [diálogos compartidos](/Users/gersonpop/Documents/Proyectos/Proyecto%20Gestion%20OT/web/src/components/ui/dialog.tsx), las acciones destructivas piden confirmación y los botones de tabla tienen texto visible en escritorio y etiquetas accesibles en móvil. Agregué los mensajes en español, inglés y francés.

TypeScript pasó, ESLint no reportó diagnósticos nuevos y los tres JSON son válidos. Verifiqué que no quedan llamadas a `confirm()` y que las llamadas al servidor son idénticas. No hice commit.

Quedan pendientes la prueba interactiva de teclado y del ancho de 375 px, porque el entorno bloqueó el acceso al navegador, y el build de producción, que la tarea deja al orquestador.