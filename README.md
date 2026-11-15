# HVAC

Aplicación web para el cálculo de ventilación y climatización (HVAC) en entorno naval: datos de diseño, dimensionamiento de conductos, pérdidas de carga, ruido, reportes y proyectos guardados.

## Estructura

```
index.html        Página principal
css/styles.css    Estilos y temas (claro, azulado, grisáceo, oscuro)
js/data.js        Tablas de accesorios (K) y materiales, estado y utilidades
js/engine.js      Motor físico (Darcy-Weisbach, Colebrook-White) y dimensionamiento
js/app.js         Interfaz, proyectos y eventos
.nojekyll         Evita el procesado de Jekyll en GitHub Pages
```

No requiere compilación ni dependencias: son archivos estáticos.

## Uso en local

Abre `index.html` en el navegador.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube todos los archivos a la raíz.
2. Settings → Pages → Source: "Deploy from a branch" → rama `main`, carpeta `/ (root)`.
3. La web quedará en `https://<usuario>.github.io/<repositorio>/`.

## Proyectos guardados

Se guardan en el navegador (localStorage). Las funciones `loadDB` y `saveDB` en `js/app.js` están aisladas para sustituirlas por Firebase.

## Móvil y tablet

Funciona en iPad, iPhone y Android desde el navegador. Se puede instalar como app:

- iPhone/iPad (Safari): Compartir → "Añadir a pantalla de inicio".
- Android (Chrome): menú ⋮ → "Instalar aplicación" o "Añadir a pantalla de inicio".

En pantallas estrechas las tablas se muestran como tarjetas. Tras instalarla funciona sin conexión.
