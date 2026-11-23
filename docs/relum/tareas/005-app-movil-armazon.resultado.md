Implementé el armazón móvil de Relum para pantallas de menos de 768 px. Incluye el título de la sección actual, contenido a pantalla completa y hasta cuatro pestañas según los permisos y el orden del menú. «Más» abre el panel con las opciones restantes. [Componente de navegación](/Users/gersonpop/Documents/Proyectos/Proyecto%20Gestion%20OT/web/src/components/protected-sidebar-layout.tsx)

Añadí el manifiesto PWA, los metadatos para iOS, los tres iconos PNG y los textos en español, inglés y francés.

**Verificación.** TypeScript pasó. Validé los JSON, el manifiesto, las dimensiones de los iconos y las reglas CSS por tamaño de pantalla. ESLint conservó los 15 errores y 12 advertencias preexistentes del componente, con cero diagnósticos nuevos.

Quedan pendientes la prueba visual en navegador, la instalación en un teléfono y el build del orquestador. No hice commit.