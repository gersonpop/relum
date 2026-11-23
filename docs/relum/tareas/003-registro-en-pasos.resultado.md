Implementé el registro en tres pasos en [OnboardingClient.tsx](/Users/gersonpop/Documents/Proyectos/Proyecto%20Gestion%20OT/web/src/app/%5Blocale%5D/onboarding/OnboardingClient.tsx). Cada campo tiene una etiqueta visible y, al intentar avanzar, el foco va al primer campo obligatorio vacío. El envío muestra el estado de carga y permite reintentar si falla.

Añadí únicamente la clave `onboardingSteps` en los JSON de español, inglés y francés. Las solicitudes de envío y cancelación conservan el mismo contenido.

Verifiqué tipos, lint sin errores nuevos, la validez de los tres JSON y el flujo con respuestas simuladas. Quedó pendiente la prueba visual a 375 px porque el acceso al navegador fue rechazado. La compilación quedó a cargo del orquestador, según la tarea. Sin commit.