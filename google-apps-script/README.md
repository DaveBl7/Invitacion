# Backend de RSVP — Google Apps Script

Este script reemplaza al que usa actualmente la invitación. Guarda cada confirmación en una Google Sheet y te avisa por correo (`david24bell@gmail.com`) cada vez que alguien confirma.

**Importante**: este script debe crearse **desde dentro de la Google Sheet** (Extensiones → Apps Script), no como un proyecto suelto en script.google.com. Así el script queda "atado" a esa hoja y no necesita ningún ID configurado — además evita un bug conocido de Google donde los proyectos sueltos a veces no piden los permisos correctos al desplegarse.

## Qué agrega respecto al script anterior

- Valida que el nombre no esté vacío y que se haya elegido "sí" o "no" antes de guardar nada.
- Guarda el estado de asistencia, el número de acompañantes y sus nombres (antes el formulario no pedía esto).
- Mantiene **dos hojas**: `RSVPs` (historial completo, un renglón por cada envío) y `Resumen` (un renglón por invitado con su respuesta más reciente — ver sección de rondas de confirmación más abajo).
- Envía un correo de notificación por cada confirmación nueva.
- Si el envío del correo o la actualización del resumen fallan por algún motivo, la fila del historial igual se guarda (no se pierde la confirmación).
- Incluye `pruebaManual()` y `pruebaCorreo()` para probar todo sin depender del sitio web ni de la implementación como Web App.

## Pasos para ponerlo en marcha

1. **Abre la Google Sheet** donde quieres que se guarden las confirmaciones (créala si no existe todavía — puede estar vacía).
2. Menú **Extensiones → Apps Script**. Se abre un editor de código ya atado a esa Sheet.
3. **Borra todo el contenido** del archivo `Code.gs` (el que abre por defecto) y **pega el contenido completo de `Codigo.gs`** (este mismo folder).
4. Edita, dentro del propio editor, esta línea al inicio del archivo si quieres que el aviso llegue a otro correo:
   ```js
   const NOTIFY_EMAIL = 'david24bell@gmail.com';
   ```
5. Ícono de engrane ⚙️ **Configuración del proyecto** (menú lateral) → activa **"Mostrar el archivo de manifiesto 'appsscript.json' en el editor"**.
6. Vuelve al editor de código (ícono `< >`), abre el archivo nuevo `appsscript.json` y reemplaza su contenido por:
   ```json
   {
     "timeZone": "America/Hermosillo",
     "dependencies": {},
     "exceptionLogging": "STACKDRIVER",
     "runtimeVersion": "V8",
     "oauthScopes": [
       "https://www.googleapis.com/auth/spreadsheets.currentonly",
       "https://www.googleapis.com/auth/script.send_mail"
     ]
   }
   ```
7. Guarda todo (ícono de disco o `Ctrl/Cmd + S`).
8. **Antes de desplegar la Web App**, prueba el script directamente en el editor:
   - Elige `pruebaManual` en el desplegable de funciones (junto al botón ▷ Ejecutar) y dale **Ejecutar**. Autoriza permisos si te los pide.
   - Revisa tu Sheet: deben aparecer una fila en "RSVPs" y otra en "Resumen" con "Prueba manual".
   - Elige `pruebaCorreo` en el mismo desplegable y dale **Ejecutar** — ver la sección de correo abajo.
9. **Implementar → Nueva implementación** → Tipo: **Aplicación web** → Ejecutar como: **Yo** → Quién tiene acceso: **Cualquier usuario**.
10. Copia la **URL que termina en `/exec`** y pégala en `js/main-final.js`, constante `APPS_SCRIPT_URL`.
11. Prueba el formulario del sitio y revisa "Ejecuciones" para confirmar que corrió sin errores.

## El correo no llega (aunque la Sheet sí se llena)

Esto pasa porque `enviarNotificacion()` está envuelta en un `try/catch` dentro de `doPost` — a propósito, para que si el correo falla por lo que sea, la confirmación del invitado NO se pierda. El problema es que ese mismo `try/catch` esconde el error real, así que nunca lo ves.

1. **Revisa spam/promociones primero** — es la causa más común, los correos automáticos de Apps Script frecuentemente caen ahí.
2. Si no está ahí, corre `pruebaCorreo()` directamente en el editor (desplegable de funciones junto a ▷ Ejecutar). A diferencia de `doPost`, esta función **no** tiene try/catch alrededor del envío, así que si hay un problema real (permiso no otorgado, cuota excedida, etc.) el editor te va a mostrar el error exacto en una ventana emergente, en vez de tragárselo en silencio.
3. Si te pide autorizar el permiso de "enviar correo en tu nombre" en ese momento, acéptalo — es probable que ese haya sido el problema: el permiso de Sheets se autorizó bien (por eso las filas sí se guardan), pero el de correo (`script.send_mail`) nunca se terminó de conceder.
4. Después de que `pruebaCorreo()` funcione sola, vuelve a probar el formulario completo del sitio.

## Segunda y tercera ronda de confirmación, acercándose la boda

No necesitas tocar el sitio ni el script para esto — simplemente **vuelve a compartir el mismo link de la invitación** cuando quieras pedir una confirmación final. Cada invitado puede volver a llenar el formulario, y aquí es donde entran las dos hojas:

- **`RSVPs`**: queda como bitácora completa — ahí se acumulan TODOS los envíos, de todas las rondas, sin borrar nada. Útil si algún día quieres ver el historial de alguien en particular.
- **`Resumen`**: tiene **un solo renglón por invitado** (identificado por su nombre, ignorando mayúsculas/espacios extra). Cada vez que alguien vuelve a confirmar, su fila en Resumen se **actualiza** con la respuesta más reciente — no se duplica. La columna **"Veces que confirmó"** te dice cuántas rondas ha respondido esa persona.

**Para saber quiénes realmente van a asistir**: filtra la columna "Asistencia (última)" de la hoja `Resumen` por "Sí". Eso te da la lista final, ya depurada, sin importar cuántas veces haya cambiado de opinión alguien entre rondas.

**Para saber quién NO ha respondido nada todavía** (útil para mandarles un recordatorio en la segunda ronda): agrega una hoja aparte, por ejemplo `Lista de Invitados`, con tu lista completa de nombres esperados en la columna A. En la columna B pon esta fórmula (arrástrala hacia abajo):
```
=IFERROR(VLOOKUP(LOWER(TRIM(A2)), Resumen!A:C, 3, FALSE), "Sin respuesta")
```
Esto busca cada nombre de tu lista dentro de `Resumen` y te dice "Sí", "No", o "Sin respuesta" si esa persona nunca ha llenado el formulario.

## Solución de problemas (envío en general)

**El formulario dice que se envió pero no aparece nada en la Sheet.**

Como el sitio llama a Apps Script con `mode: 'no-cors'` (necesario porque Apps Script no permite leer su respuesta desde otro dominio), el navegador nunca puede confirmar si tu script realmente se ejecutó bien — por eso el mensaje de éxito aparece incluso si algo falló del lado de Google. Para diagnosticarlo:

1. En el editor de Apps Script, menú lateral → ícono de reloj/lista, **"Ejecuciones"**.
2. Haz clic en una ejecución fallida para ver el error exacto.
3. Si dice **"No se solicitaron alcances para esta implementación"**: revisa que `appsscript.json` tenga los `oauthScopes` del paso 6, luego **Implementar → Gestionar implementaciones → editar (lápiz) → Nueva versión → Implementar**.
4. Si menciona **Spreadsheet/openById/permission**: confirma que el script está creado desde dentro de la Sheet (Extensiones → Apps Script), no como proyecto suelto en script.google.com.
5. Usa `pruebaManual()` para aislar si el problema es de permisos/lógica del script o específico de la implementación como Web App.

## Notas

- Cada vez que cambies el código y quieras que el sitio use la versión nueva: **Implementar → Gestionar implementaciones → editar (lápiz) → Nueva versión → Implementar**. Solo guardar el código no actualiza la Web App ya publicada.
- Para contar cuántas personas van en total (incluyendo acompañantes), usa la hoja `Resumen`: filtra por "Sí" y suma 1 + el valor de "No. Acompañantes" de cada fila.
