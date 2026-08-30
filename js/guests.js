/* =========================================================
   LISTA DE INVITADOS — edita este archivo cuando tengas tu lista final.
   No toca nada más del sitio; main.js sólo lo lee.

   CÓMO FUNCIONA
   A cada invitado (o familia) le compartes un link con un identificador
   ("slug") al final:

     https://tu-dominio.com/?g=maria-lopez

   Cuando alguien abre ese link, el formulario de confirmación:
     - le rellena su nombre automáticamente (puede corregirlo si hace falta)
     - limita el campo "acompañantes" al número que le asignes aquí

   Si el link no trae "?g=..." o el slug no está en esta lista, se aplica
   el límite por defecto (0-1 acompañante) definido en main.js —
   así nadie queda bloqueado mientras completas esta lista, pero tampoco
   se cuela nadie con más acompañantes de la cuenta.

   CÓMO AGREGAR INVITADOS
   Descomenta/copia una línea por invitado o familia. El slug puede ser
   lo que quieras (sin espacios ni acentos, para que quede limpio en la
   URL) — minúsculas y guiones es lo más simple de escribir/compartir.

   Ejemplos:
   window.GUEST_LIST = {
     'maria-lopez':   { nombre: 'María López',               maxAcompanantes: 1 },
     'familia-perez': { nombre: 'Familia Pérez',              maxAcompanantes: 4 },
     'juan-y-ana':    { nombre: 'Juan Torres y Ana Ramírez',  maxAcompanantes: 2 },
   };
   ========================================================= */
window.GUEST_LIST = {
  // Reemplaza este ejemplo por tus invitados reales:
  'ejemplo-invitado': { nombre: 'Nombre de Ejemplo', maxAcompanantes: 2 },
};
