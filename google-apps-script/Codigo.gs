/**
 * Backend de confirmaciones (RSVP) para la invitación de boda.
 *
 * QUÉ HACE
 * - Recibe un POST con JSON: { nombre, asistencia: 'si'|'no', acompanantes: string[], comentarios }
 * - Valida los datos.
 * - Agrega una fila a la hoja "RSVPs" (historial completo, un renglón por
 *   cada envío — si alguien confirma varias veces en distintas rondas,
 *   aquí quedan TODOS sus envíos).
 * - Actualiza la hoja "Resumen": un renglón POR INVITADO con su respuesta
 *   MÁS RECIENTE. Si ya existía, se sobrescribe con el nuevo estado en vez
 *   de duplicarse — así, si mandas una segunda o tercera ronda de
 *   confirmación acercándose la boda, "Resumen" siempre refleja quién
 *   realmente va a asistir según su última respuesta.
 * - Envía un correo de notificación a NOTIFY_EMAIL con el resumen de la confirmación.
 *
 * CONFIGURACIÓN (edita esta constante antes de desplegar)
 * - NOTIFY_EMAIL: el correo al que quieres que lleguen los avisos.
 *
 * DESPLIEGUE (importante: este script debe crearse DESDE la Google Sheet,
 * no desde script.google.com por separado — así se evita el bug de Google
 * donde a veces no detecta los permisos que necesita un script "suelto")
 * 1. Abre la Google Sheet donde quieres guardar las confirmaciones.
 * 2. Menú Extensiones → Apps Script. Esto abre un editor de script YA
 *    atado a esta Sheet (no hace falta ID).
 * 3. Borra el contenido de `Code.gs` (o como se llame el archivo por
 *    defecto) y pega TODO este archivo.
 * 4. Reemplaza NOTIFY_EMAIL abajo si quieres que el aviso llegue a otro correo.
 * 5. Ícono de engrane ⚙️ "Configuración del proyecto" → activa "Mostrar el
 *    archivo de manifiesto 'appsscript.json' en el editor". Abre ese
 *    archivo nuevo y reemplázalo por:
 *      {
 *        "timeZone": "America/Hermosillo",
 *        "dependencies": {},
 *        "exceptionLogging": "STACKDRIVER",
 *        "runtimeVersion": "V8",
 *        "oauthScopes": [
 *          "https://www.googleapis.com/auth/spreadsheets.currentonly",
 *          "https://www.googleapis.com/auth/script.send_mail"
 *        ]
 *      }
 * 6. Guarda (icono de disco o Ctrl/Cmd+S).
 * 7. Implementar → Nueva implementación → tipo "Aplicación web".
 *      - Ejecutar como: Yo (tu cuenta).
 *      - Quién tiene acceso: Cualquier usuario.
 * 8. Autoriza los permisos hasta el final cuando te los pida.
 * 9. Copia la URL que termina en "/exec" y pégala en js/main-final.js
 *    (constante APPS_SCRIPT_URL).
 * 10. Revisa "Ejecuciones" (menú lateral) para confirmar que corrió sin errores.
 *
 * SEGUNDA / TERCERA RONDA DE CONFIRMACIÓN
 * No necesitas cambiar nada del sitio ni del script: simplemente vuelve a
 * compartir el mismo link de la invitación más cerca de la fecha. Cada
 * quien puede volver a llenar el formulario y su respuesta más reciente
 * reemplaza automáticamente a la anterior en la hoja "Resumen" (el
 * historial completo de todos los envíos se conserva en "RSVPs" por si
 * quieres revisarlo). Para ver quiénes SÍ van a asistir en definitiva,
 * filtra la columna "Asistencia (última)" de "Resumen" por "Sí".
 */

const NOTIFY_EMAIL = 'david24bell@gmail.com';
const SHEET_NAME = 'RSVPs';
const RESUMEN_SHEET_NAME = 'Resumen';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');

    const nombre = String(body.nombre || '').trim();
    const asistencia = String(body.asistencia || '').trim().toLowerCase();
    const acompanantes = Array.isArray(body.acompanantes)
      ? body.acompanantes.map(String).map(s => s.trim()).filter(Boolean)
      : [];
    const comentarios = String(body.comentarios || '').trim();
    const invitado = String(body.invitado || '').trim(); // slug del link personalizado (?g=...), vacío si no traía uno

    // ---- Validación ----
    if (!nombre) {
      return jsonResponse({ status: 'error', message: 'El nombre es obligatorio.' });
    }
    if (asistencia !== 'si' && asistencia !== 'no') {
      return jsonResponse({ status: 'error', message: 'Falta indicar si asistirás.' });
    }

    // ---- Guardar en el historial (RSVPs) ----
    const sheet = getOrCreateSheet();
    sheet.appendRow([
      new Date(),
      nombre,
      asistencia === 'si' ? 'Sí' : 'No',
      acompanantes.join(', '),
      acompanantes.length,
      comentarios,
      invitado
    ]);

    // ---- Actualizar el resumen por invitado (no debe tumbar la respuesta si falla) ----
    try {
      actualizarResumen(nombre, asistencia, acompanantes, comentarios, invitado);
    } catch (resumenErr) {
      // Se ignora: el historial ya quedó guardado, que es lo importante.
    }

    // ---- Notificación por correo (no debe tumbar la respuesta si falla) ----
    try {
      enviarNotificacion(nombre, asistencia, acompanantes, comentarios);
    } catch (mailErr) {
      // Se ignora: la fila ya quedó guardada, que es lo importante.
    }

    return jsonResponse({ status: 'ok' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: 'Error al procesar la solicitud: ' + err.message });
  }
}

function getOrCreateSheet() {
  // Como el script vive dentro de la propia Sheet, getActiveSpreadsheet()
  // siempre apunta al archivo correcto — no hace falta ningún ID.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Fecha', 'Nombre', 'Asistencia', 'Acompañantes', 'No. Acompañantes', 'Comentarios', 'Invitado (link)']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function normalizarNombre(nombre) {
  return nombre.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Mantiene un renglón único por invitado (identificado por su nombre
 * normalizado) con su respuesta más reciente. Si el invitado ya existía,
 * sobrescribe su fila; si es nuevo, la agrega. También lleva la cuenta de
 * cuántas veces ha confirmado (útil para saber si ya respondió en la
 * segunda/tercera ronda o sigue con su respuesta original).
 */
function actualizarResumen(nombre, asistencia, acompanantes, comentarios, invitado) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let resumen = ss.getSheetByName(RESUMEN_SHEET_NAME);
  if (!resumen) {
    resumen = ss.insertSheet(RESUMEN_SHEET_NAME);
    resumen.appendRow([
      'Clave', 'Nombre', 'Asistencia (última)', 'Acompañantes', 'No. Acompañantes',
      'Comentarios', 'Última actualización', 'Veces que confirmó', 'Invitado (link)'
    ]);
    resumen.setFrozenRows(1);
  }

  const clave = normalizarNombre(nombre);
  const numFilas = resumen.getLastRow();
  let rowIndex = -1; // índice de fila real en la hoja (1-based), -1 si no existe
  let vecesPrevio = 0;

  if (numFilas > 1) {
    const claves = resumen.getRange(2, 1, numFilas - 1, 1).getValues();
    for (let i = 0; i < claves.length; i++) {
      if (claves[i][0] === clave) {
        rowIndex = i + 2; // +2: la fila 1 es encabezado y el arreglo es 0-based
        vecesPrevio = Number(resumen.getRange(rowIndex, 8).getValue()) || 0;
        break;
      }
    }
  }

  const nuevaFila = [
    clave,
    nombre,
    asistencia === 'si' ? 'Sí' : 'No',
    acompanantes.join(', '),
    acompanantes.length,
    comentarios,
    new Date(),
    vecesPrevio + 1,
    invitado
  ];

  if (rowIndex === -1) {
    resumen.appendRow(nuevaFila);
  } else {
    resumen.getRange(rowIndex, 1, 1, nuevaFila.length).setValues([nuevaFila]);
  }
}

function enviarNotificacion(nombre, asistencia, acompanantes, comentarios) {
  const totalPersonas = 1 + acompanantes.length;
  const asunto = asistencia === 'si'
    ? `✨ Nueva confirmación: ${nombre} (${totalPersonas} persona${totalPersonas > 1 ? 's' : ''})`
    : `Confirmación: ${nombre} no podrá asistir`;

  const lineas = [
    `Nombre: ${nombre}`,
    `Asistencia: ${asistencia === 'si' ? 'Sí asistirá' : 'No podrá asistir'}`
  ];
  if (acompanantes.length) {
    lineas.push(`Acompañantes (${acompanantes.length}): ${acompanantes.join(', ')}`);
  }
  if (comentarios) {
    lineas.push(`Mensaje: ${comentarios}`);
  }

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: asunto,
    body: lineas.join('\n')
  });
}

/**
 * Función de prueba general: selecciónala en el desplegable de funciones
 * del editor (junto al botón ▷ Ejecutar) y dale clic a "Ejecutar" aquí
 * mismo. Prueba todo el flujo (RSVPs + Resumen + correo) sin pasar por la
 * Web App.
 */
function pruebaManual() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        nombre: 'Prueba manual',
        asistencia: 'si',
        acompanantes: ['Acompañante de prueba'],
        comentarios: 'Ejecutado desde el editor con pruebaManual()'
      })
    }
  };
  const result = doPost(fakeEvent);
  Logger.log(result.getContent());
}

/**
 * Función de prueba SOLO del correo, sin pasar por Sheets ni por doPost.
 * Selecciónala en el desplegable de funciones y dale Ejecutar. Si hay un
 * problema de permisos o configuración con el envío de correo, esta
 * función lo va a mostrar directamente como un error en el editor (a
 * diferencia de doPost, aquí NO hay try/catch que lo esconda). También te
 * pedirá autorizar el permiso de enviar correo si aún no lo has hecho.
 */
function pruebaCorreo() {
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: 'Prueba de correo — invitación de boda',
    body: 'Si recibiste este correo, MailApp está funcionando correctamente. Revisa también la carpeta de Spam/Promociones si no lo ves en la bandeja principal.'
  });
  Logger.log('Correo enviado a ' + NOTIFY_EMAIL + '. Revisa bandeja de entrada y spam.');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
