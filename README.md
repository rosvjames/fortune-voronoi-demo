# Algoritmo de Fortune - Demo Interactiva

Demo web interactiva para enseñar el algoritmo de línea de barrido de Fortune para diagramas de Voronoi. Proyecto universitario de Geometría Computacional.

## Puesta en marcha

No requiere instalación de dependencias ni paso de build. Solo necesitas un servidor HTTP estático.

### Opción 1: Python (viene preinstalado en la mayoría de sistemas)

```bash
git clone https://github.com/rosvjames/fortune-voronoi-demo.git
cd fortune-voronoi-demo/demo
python -m http.server 3080
```

Abre http://localhost:3080 en tu navegador.

### Opción 2: Node.js

```bash
git clone https://github.com/rosvjames/fortune-voronoi-demo.git
cd fortune-voronoi-demo/demo
npx serve -p 3080
```

### Opcion 3: VS Code

Si usas VS Code, instala la extensión **Live Server**, abre la carpeta del proyecto y haz click derecho en `demo/index.html` > "Open with Live Server".

> **Nota:** Abrir `index.html` directamente como archivo (`file://`) no funciona porque los navegadores bloquean los ES modules por políticas de seguridad (CORS). Es necesario usar un servidor HTTP.

## Uso

- **Click** en el canvas para agregar un sitio
- **Click derecho** sobre un sitio para eliminarlo
- **Arrastra la línea roja** para mover la línea de barrido
- **Flechas arriba/abajo** para mover la línea de barrido con el teclado
- **N / P** para saltar al siguiente/anterior evento
- Botón **Auto** para animar el barrido automáticamente
- Usa los presets (Triángulo, Evento Círculo, Colineal) para explorar casos específicos

## Estructura del proyecto

```
demo/
  index.html          — Página principal (CSS inline)
  js/
    geometry.js       — Funciones matemáticas puras
    fortune.js        — Cómputo del estado del algoritmo
    renderer.js       — Dibujado en Canvas 2D
    dataStructViz.js  — Visualización del BST y cola de eventos
    main.js           — Clase App: estado, presets, loop principal
    ui.js             — Entrada del usuario: drag, click, teclado
```
