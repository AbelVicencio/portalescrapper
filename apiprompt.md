
Recuerda que siempre puedes probar directamente la API que está en línea para tí. Ejemplos:

curl -X 'GET' 'https://api.medialog.com.mx/v1/emisoras/activas?fields=emisora%2Cabreviatura%2Cnombre' -H 'accept: application/json' -H 'X-Internal-App-ID: ak_live_accesoapi_h3CvobFBGaJfVgKh1uJxSqtGz8H3u2r5Sk3KPRcayek'
curl -X 'GET' 'https://api.medialog.com.mx/v1/prensa/clasificacion/423/analisis/nucleado?pagina=1&tamano_pagina=5&refresh=false&Tipos=7%2C2%2C24%2C11%2C4%2C3%2C23&procesar_ia=true' -H 'accept: application/json' -H 'X-Internal-App-ID: ak_live_accesoapi_h3CvobFBGaJfVgKh1uJxSqtGz8H3u2r5Sk3KPRcayek'

curl -X 'GET' 'https://api.medialog.com.mx/v1/transcripciones/19903086/tarjeta?plantilla=default' -H 'accept: text/html' -H 'X-Internal-App-ID: ak_live_accesoapi_h3CvobFBGaJfVgKh1uJxSqtGz8H3u2r5Sk3KPRcayek'

El log de la api está en   /var/log/medialog/api.log   del server shiva

La estructura general de la api está en @ApiMedialog.txt  



