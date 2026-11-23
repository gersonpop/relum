En móvil, Usuarios, Empresa y Configuración ahora muestran pestañas horizontales de al menos 44 px. La pestaña activa se desplaza a la vista y el contenido ocupa el espacio restante con desplazamiento propio. También compacté los encabezados y limité las descripciones a dos líneas.

Solo cambié [EmbeddedPattern.tsx](</Users/gersonpop/Documents/Proyectos/Proyecto Gestion OT/web/src/components/module-patterns/EmbeddedPattern.tsx>) y [NewPagePattern.tsx](</Users/gersonpop/Documents/Proyectos/Proyecto Gestion OT/web/src/components/module-patterns/NewPagePattern.tsx>).

Pasaron TypeScript, la validación de los tres JSON y la comprobación de las reglas móviles de Tailwind. Una prueba simulada verificó el desplazamiento de la pestaña activa. ESLint reportó el mismo error y la misma advertencia que antes del cambio.

Queda pendiente la validación visual en navegador porque el entorno bloqueó el servidor local. No ejecuté el build ni hice commit.