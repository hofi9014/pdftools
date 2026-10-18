import type { LegalTexts } from './types';

const es: LegalTexts = {
  privacy: {
    title: 'Política de privacidad',
    updated: 'Última actualización: 14 de octubre de 2026',
    sections: [
      {
        h: '1. Lo esencial',
        p: 'Las herramientas de OptimaPDF funcionan en tu navegador: los archivos con los que trabajas no se envían a nuestro servidor ni a ningún otro sitio. Al servidor solo llega lo que necesitan dos funciones: el texto en las funciones de IA y la dirección de una página en URL a PDF. Las estadísticas de visitas (Google Analytics) solo se recogen con tu consentimiento. No hay cuentas de usuario.',
      },
      {
        h: '2. Responsable del tratamiento',
        p: 'El responsable de los datos personales es Leszek Hofman, Dąbrówka Nowa, Polonia. Contacto: kontakt@optimapdf.com. No se ha designado un Delegado de Protección de Datos: escribe a la dirección anterior para cualquier asunto relacionado con tus datos.',
      },
      {
        h: '3. Qué datos tratamos',
        sub: [
          {
            h: '3.1 Tus archivos',
            p: 'Todas las herramientas de archivos —entre ellas unir, dividir, comprimir, OCR, editar, firmar, censurar, proteger con contraseña y todas las conversiones (PDF ↔ Word, Excel, PowerPoint, OpenOffice, imágenes, HTML, EPUB, TXT, SVG)— funcionan por completo en tu navegador (JavaScript y WebAssembly). El archivo no se envía a nuestro servidor. Del servidor solo se descargan los archivos de la aplicación, las fuentes y los datos de idioma del OCR.',
          },
          {
            h: '3.2 Funciones de IA (Chat IA, Resumen IA, Traductor IA)',
            p: 'Cuando usas una función de IA, el texto extraído de tu archivo (y, en el chat, tu pregunta) se envía a través de nuestro servidor a OpenRouter, Inc. (EE. UU.), que lo pasa al proveedor del modelo de lenguaje (actualmente OpenAI GPT-4o mini, servido por OpenAI o Microsoft Azure). La herramienta te lo indica antes de enviar nada.',
            items: [
              'Cada solicitud exige un proveedor que, según OpenRouter, no conserve los datos más allá de la solicitud ni entrene modelos con ellos. Si no hay ninguno disponible, la solicitud falla: no se envía a otro.',
              'La solicitud la envía nuestro servidor con la clave API común del sitio: OpenRouter no recibe tu dirección IP ni datos del navegador, y no necesitas una clave propia.',
              'No guardamos el texto enviado ni la respuesta.',
              'El límite es de 15 solicitudes al día por dirección IP. El contador (tu dirección IP y el número de solicitudes) se guarda en una base de datos de Upstash durante 24 horas desde la primera solicitud y luego se borra automáticamente.',
            ],
          },
          {
            h: '3.3 URL a PDF',
            p: 'La dirección de página que introduces llega a nuestro servidor, que descarga esa página y crea un PDF. No guardamos ni la dirección, ni la página, ni el PDF. El límite es de 30 conversiones cada 10 minutos por dirección IP; el contador se guarda en una base de datos de Upstash durante 10 minutos.',
          },
          {
            h: '3.4 Datos técnicos',
            p: 'Nuestro proveedor de alojamiento (Vercel Inc.) trata datos técnicos al atender las solicitudes —dirección IP, dirección de la página, hora y tipo de navegador— para hacer funcionar y proteger el sitio. Nuestro servidor solo registra las solicitudes a la API rechazadas (por ejemplo, un límite superado o una solicitud desde otro sitio), con la dirección IP acortada a sus tres primeras partes (p. ej., 203.0.113.0).',
          },
          {
            h: '3.5 Guardado en tu navegador',
            p: 'Algunos ajustes se guardan en tu dispositivo. No se envían ni a nosotros ni a terceros:',
            items: [
              'localStorage: tema (claro/oscuro), idioma elegido, tu decisión sobre la analítica, ajustes de las herramientas y la lista de herramientas usadas recientemente.',
              'La cookie «x-detected-locale» (hasta 12 meses) con el idioma elegido, para que el sitio se abra en tu idioma. Es necesaria para las versiones de idioma y no requiere consentimiento.',
              'La caché de la aplicación (service worker): archivos del sitio y datos de idioma del OCR descargados, para que las herramientas funcionen más rápido y sin conexión.',
              'Tras conectar Google Drive: un token de acceso en sessionStorage, que se elimina al cerrar la pestaña o cuando caduca.',
            ],
          },
          {
            h: '3.6 Google Drive, Dropbox y OneDrive',
            p: 'Si eliges abrir un archivo desde la nube o guardarlo en ella, el archivo viaja directamente entre tu navegador y el proveedor elegido (Google, Dropbox, Microsoft), no a través de nuestro servidor. Inicias sesión en la ventana de ese proveedor y a esa operación se aplican sus condiciones y su política de privacidad. Google Drive solo nos da acceso a los archivos abiertos o creados con OptimaPDF; Dropbox, a guardar archivos; OneDrive y SharePoint, a los archivos que solicite la ventana de Microsoft.',
          },
        ],
      },
      {
        h: '4. Base jurídica',
        items: [
          'Art. 6.1.b RGPD: prestación del servicio que solicitas, es decir, las funciones de IA y URL a PDF.',
          'Art. 6.1.f RGPD: interés legítimo del responsable: funcionamiento y seguridad del sitio, límites de solicitudes, prevención de abusos, registros técnicos.',
          'Art. 6.1.a RGPD: tu consentimiento para las estadísticas de visitas de Google Analytics. Puedes retirarlo en cualquier momento (apartado 10).',
        ],
      },
      {
        h: '5. Destinatarios',
        p: 'Tratan los datos por encargo nuestro o los reciben:',
        items: [
          'Vercel Inc. (EE. UU.): alojamiento del sitio y del servidor de la aplicación.',
          'Upstash, Inc. (EE. UU.): base de datos de los contadores de límites (dirección IP y número de solicitudes). La base de datos se encuentra en la zona de Washington D. C. (EE. UU., región iad1).',
          'OpenRouter, Inc. (EE. UU.) y el proveedor del modelo al que OpenRouter pase la solicitud: solo cuando usas las funciones de IA.',
          'Google LLC (EE. UU.): Google Analytics, solo con tu consentimiento.',
          'Autoridades públicas: solo cuando lo exija la ley.',
        ],
      },
      {
        h: '6. Transferencias fuera del EEE',
        p: 'El servidor de la aplicación funciona en un centro de datos de Vercel en EE. UU., y todos los destinatarios del apartado 5 tienen su sede en EE. UU. Por tanto, los datos descritos en los apartados 3.2–3.4 y los de Google Analytics se transfieren a EE. UU. Vercel Inc. y Google LLC están certificadas en el Marco de Privacidad de Datos UE-EE. UU. (Decisión de Ejecución (UE) 2023/1795 de la Comisión); Vercel aplica además las cláusulas contractuales tipo. En el caso de Upstash y OpenRouter, la transferencia se realiza conforme a sus condiciones de tratamiento de datos. Tus archivos no se transfieren a ningún sitio (apartado 3.1).',
      },
      {
        h: '7. Cuánto tiempo conservamos los datos',
        items: [
          'Tus archivos: nunca nos llegan. En el navegador desaparecen al cerrar o recargar la página.',
          'Texto enviado a la IA y direcciones de páginas para convertir: no los guardamos.',
          'Contador del límite de IA (dirección IP): 24 horas desde la primera solicitud. Contador de URL a PDF: 10 minutos.',
          'Registros del servidor en el proveedor de alojamiento: 1 hora con el plan actual de Vercel.',
          'Datos de Google Analytics: según el ajuste de conservación de Google Analytics, como máximo 14 meses.',
          'Ajustes en tu navegador: hasta que los borres; la cookie de idioma, hasta 12 meses.',
        ],
      },
      {
        h: '8. Tus derechos',
        p: 'Tienes derecho de acceso (art. 15 RGPD), rectificación (art. 16), supresión (art. 17), limitación del tratamiento (art. 18), portabilidad (art. 20), oposición (art. 21) y a retirar el consentimiento en cualquier momento, sin que ello afecte a la licitud del tratamiento anterior. También puedes presentar una reclamación ante una autoridad de control; en Polonia, el Presidente de la Oficina de Protección de Datos Personales (ul. Stawki 2, 00-193 Varsovia). No hay cuentas, por lo que los datos técnicos normalmente no pueden vincularse a una persona concreta (art. 11 RGPD); escríbenos y veremos qué podemos hacer.',
      },
      {
        h: '9. Seguridad',
        items: [
          'Conexión HTTPS cifrada con HSTS.',
          'Una Content Security Policy y cabeceras que impiden incrustar el sitio en otros sitios y bloquean el acceso a la cámara, el micrófono y la ubicación.',
          'Comprobación del origen de las solicitudes a la API (protección CSRF), límites de solicitudes y un límite de tamaño de solicitud (100 MB).',
          'URL a PDF no descarga direcciones de redes internas ni de los servicios en la nube del servidor (protección SSRF).',
          'Detalles: la página «Seguridad».',
        ],
      },
      {
        h: '10. Google Analytics y consentimiento',
        p: 'Con tu consentimiento usamos Google Analytics 4 (Google LLC) para contar las visitas y ver qué herramientas se usan. Google guarda entonces cookies con un identificador en tu navegador (_ga, _ga_*) y recibe datos de la visita: páginas vistas, ubicación aproximada, tipo de dispositivo y navegador, y de dónde vienes.',
        items: [
          'Sin consentimiento, el script de Google Analytics no se carga en absoluto: el sitio no contacta con Google.',
          'Puedes cambiar o retirar tu consentimiento en cualquier momento con el botón «Configuración de cookies» al pie de cada página. Al retirarlo, Google Analytics se desactiva al instante y se borran sus cookies.',
          'No usamos Google Analytics para publicidad ni para elaborar perfiles. Los archivos con los que trabajas nunca llegan a Google.',
        ],
      },
      {
        h: '11. Cambios',
        p: 'Podemos modificar esta política cuando cambie el funcionamiento del sitio; la fecha del último cambio figura en la parte superior de la página. Preguntas: kontakt@optimapdf.com.',
      },
    ],
  },

  rodo: {
    title: 'Información sobre el RGPD',
    updated: 'Última actualización: 14 de octubre de 2026',
    sections: [
      {
        h: '1. Responsable del tratamiento',
        p: 'El responsable de los datos personales es Leszek Hofman, Dąbrówka Nowa, Polonia (optimapdf.com). Contacto para cualquier asunto relacionado con tus datos: kontakt@optimapdf.com.',
      },
      {
        h: '2. Qué datos tratamos y para qué',
        items: [
          'Tus archivos: no los tratamos en un servidor. Todas las herramientas de archivos funcionan en tu navegador y el archivo no sale de tu dispositivo.',
          'Texto enviado a las funciones de IA: lo pasamos a través de nuestro servidor a OpenRouter y al proveedor del modelo para realizar tu petición (resumen, traducción, respuesta). No lo guardamos.',
          'La dirección de página en URL a PDF: nuestro servidor descarga esa página y crea un PDF. No la guardamos.',
          'Dirección IP: para contar los límites de solicitudes (IA: 24 horas; URL a PDF: 10 minutos) y prevenir abusos; en el registro del servidor solo para una solicitud rechazada y acortada.',
          'Datos de visitas en Google Analytics: solo con tu consentimiento.',
          'Ajustes (tema, idioma, decisión sobre la analítica): guardados solo en tu navegador.',
        ],
      },
      {
        h: '3. Bases jurídicas',
        items: [
          'Art. 6.1.b RGPD: prestación del servicio que solicitas (funciones de IA, URL a PDF).',
          'Art. 6.1.f RGPD: interés legítimo: seguridad y límites de solicitudes.',
          'Art. 6.1.a RGPD: consentimiento para Google Analytics.',
        ],
      },
      {
        h: '4. Plazos de conservación',
        items: [
          'Archivos, texto enviado a la IA y direcciones de páginas para convertir: no se conservan.',
          'Contadores de límites con la dirección IP: 24 horas (IA) y 10 minutos (URL a PDF).',
          'Registros del servidor en el proveedor de alojamiento: 1 hora (plan actual de Vercel).',
          'Google Analytics: como máximo 14 meses.',
          'Ajustes en tu navegador: hasta que los borres; la cookie de idioma, hasta 12 meses.',
        ],
      },
      {
        h: '5. Destinatarios',
        p: 'No vendemos datos ni los compartimos con fines de marketing. Tratan datos por encargo nuestro: Vercel Inc. (alojamiento), Upstash, Inc. (contadores de límites), OpenRouter, Inc. y el proveedor del modelo (solo funciones de IA) y, con tu consentimiento, Google LLC (Google Analytics). Todos tienen su sede en EE. UU.',
      },
      {
        h: '6. Transferencias a terceros países',
        p: 'El servidor de la aplicación funciona en EE. UU., por lo que los datos del apartado 2 (salvo los archivos y los ajustes del navegador) se transfieren a EE. UU. Vercel y Google están certificadas en el Marco de Privacidad de Datos UE-EE. UU. (Decisión (UE) 2023/1795 de la Comisión); Upstash y OpenRouter tratan los datos conforme a sus condiciones de tratamiento de datos.',
      },
      {
        h: '7. Tus derechos',
        items: [
          'Acceso (art. 15) y rectificación (art. 16).',
          'Supresión (art. 17) y limitación del tratamiento (art. 18).',
          'Portabilidad (art. 20) y oposición (art. 21).',
          'Retirar el consentimiento en cualquier momento; para Google Analytics, con el botón «Configuración de cookies» al pie de la página.',
        ],
      },
      {
        h: '8. Cómo ejercer tus derechos',
        p: 'Escribe a kontakt@optimapdf.com. Respondemos en un plazo de 30 días y sin coste (salvo solicitudes manifiestamente infundadas o excesivas, art. 12.5 RGPD). No hay cuentas, por lo que los datos técnicos normalmente no pueden vincularse a una persona concreta (art. 11 RGPD).',
      },
      {
        h: '9. Reclamaciones',
        p: 'Si crees que tratamos tus datos infringiendo el RGPD, puedes presentar una reclamación ante una autoridad de control; en Polonia, el Presidente de la Oficina de Protección de Datos Personales, ul. Stawki 2, 00-193 Varsovia.',
      },
      {
        h: '10. Cookies y almacenamiento del navegador',
        p: 'Usamos una cookie necesaria (x-detected-locale, el idioma del sitio, hasta 12 meses) y localStorage para los ajustes. Las cookies de Google Analytics (_ga, _ga_*) solo aparecen tras tu consentimiento y se eliminan al retirarlo. No usamos cookies publicitarias.',
      },
      {
        h: '11. Cambios',
        p: 'Actualizamos esta información cuando cambia el funcionamiento del sitio; la fecha del último cambio figura en la parte superior de la página.',
      },
    ],
  },

  security: {
    title: 'Seguridad',
    updated: 'Última actualización: 14 de octubre de 2026',
    intro: 'La protección más importante de OptimaPDF es algo que no hacemos: no enviamos tus archivos a un servidor. A continuación explicamos cómo funciona y cuáles son las demás protecciones, solo las que realmente aplicamos.',
    sections: [
      {
        h: '1. Los archivos se quedan en tu dispositivo',
        p: 'Todas las herramientas de archivos, incluidas la compresión, el OCR y las conversiones, funcionan en tu navegador (JavaScript y WebAssembly). El archivo no se envía a un servidor, así que nadie de nuestro lado puede acceder a él. Puedes comprobarlo tú mismo: abre las herramientas para desarrolladores del navegador (F12), la pestaña «Red», y procesa un archivo: no verás ninguna subida del archivo. Al servidor solo llegan el texto de las funciones de IA y la dirección de una página en URL a PDF.',
      },
      {
        h: '2. Conexión cifrada',
        p: 'El sitio funciona solo por HTTPS. La cabecera HSTS (con inclusión en la lista de precarga de los navegadores) hace que el navegador se conecte siempre de forma segura, incluso en la primera visita.',
      },
      {
        h: '3. Protección en el navegador',
        items: [
          'Una Content Security Policy limita desde dónde puede cargar scripts el sitio y con qué puede conectarse: nuestro dominio y los servicios que nombra (inicio de sesión de Google, Dropbox, Microsoft y, con consentimiento, Google Analytics).',
          'El sitio no puede incrustarse en otros sitios (X-Frame-Options: DENY, frame-ancestors), lo que protege del clickjacking.',
          'Permissions-Policy bloquea el acceso a la cámara, el micrófono, la ubicación, USB y pagos.',
          'X-Content-Type-Options y Referrer-Policy limitan la adivinación de tipos de archivo y la transmisión de direcciones de páginas.',
        ],
      },
      {
        h: '4. Protección del servidor',
        items: [
          'Las solicitudes a la API solo se aceptan desde nuestro propio sitio (comprobación de las cabeceras Origin y Referer: protección CSRF).',
          'Límites de solicitudes: 30 por minuto y dirección IP para la API, 15 al día para las funciones de IA, 30 cada 10 minutos para URL a PDF; límite de tamaño de solicitud de 100 MB.',
          'URL a PDF rechaza direcciones de redes privadas y locales y de los servicios en la nube del servidor, y la dirección comprobada es la misma a la que se conecta el servidor (protección contra SSRF y DNS rebinding).',
          'Las entradas de la API se comprueban en el servidor (longitud del texto, idiomas de traducción permitidos).',
        ],
      },
      {
        h: '5. Funciones de IA',
        p: 'A la IA solo enviamos el texto extraído del archivo y tu pregunta, sin tu dirección IP ni datos del navegador, a través de nuestro servidor y su clave API (no necesitas una propia). Cada solicitud exige un proveedor que, según OpenRouter, no conserve los datos más allá de la solicitud ni entrene modelos con ellos; si no hay ninguno, la solicitud no se realiza.',
      },
      {
        h: '6. Sin cuentas ni perfiles',
        p: 'No pedimos registro ni inicio de sesión, no guardamos contraseñas ni creamos perfiles de usuario. Las contraseñas para proteger y desbloquear PDF y los certificados para firmar se usan solo en tu navegador.',
      },
      {
        h: '7. Dependencias',
        p: 'Mantenemos las bibliotecas actualizadas y comprobamos sus vulnerabilidades conocidas con npm audit y una prueba que avisa de cada nueva alerta de nivel alto o crítico en las dependencias que usa el sitio.',
      },
      {
        h: '8. Notificar una vulnerabilidad',
        p: 'Si encuentras un fallo de seguridad, escribe a kontakt@optimapdf.com. Nos comprometemos a:',
        items: [
          'confirmar la recepción en 24 horas,',
          'analizarlo y publicar una corrección en 14 días (según la gravedad),',
          'contarte lo que hemos hecho,',
          'no emprender acciones legales contra quien notifique vulnerabilidades de buena fe.',
        ],
      },
      {
        h: '9. Certificaciones',
        p: 'OptimaPDF no tiene certificación ISO 27001 ni SOC 2 propia. Nuestro proveedor de alojamiento, Vercel, tiene la certificación ISO 27001:2022 y un informe SOC 2 Tipo 2. Como los archivos nunca llegan a nuestro servidor, de nuestro lado no hay archivos «en reposo» que cifrar.',
      },
      {
        h: '10. Firma digital y eIDAS',
        p: 'La herramienta «Firmar PDF» crea una firma digital PAdES con tu propio certificado (.p12/.pfx), por completo en el navegador; ni el archivo ni el certificado se envían. Es una firma criptográfica real, pero no automáticamente una firma electrónica cualificada (QES) según el Reglamento eIDAS (UE 910/2014): la condición de QES depende de que el certificado lo haya emitido un prestador cualificado de servicios de confianza y de que la clave esté en un dispositivo cualificado.',
      },
    ],
  },

  principles: {
    security: 'Usamos una conexión HTTPS cifrada, una Content Security Policy, protección de la API contra abusos y límites de solicitudes. Lo más importante: las herramientas de archivos funcionan en tu navegador, así que tus archivos ni siquiera llegan a nuestro servidor.',
    tracking: 'Actualmente el sitio no muestra anuncios. En el futuro podríamos introducir anuncios discretos (p. ej., Google AdSense) para cubrir los costes de alojamiento y desarrollo; si ocurre, actualizaremos esta información. En cualquier caso, todas las herramientas PDF seguirán siendo gratuitas y sin límite. Usamos Google Analytics solo con tu consentimiento, que puedes retirar en cualquier momento con el botón «Configuración de cookies». No usamos píxeles de remarketing ni perfiles de comportamiento.',
  },
};

export default es;
