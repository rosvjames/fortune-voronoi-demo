# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive web demo for teaching Fortune's sweep line algorithm for Voronoi diagrams. University project (Computational Geometry, Semestre 8). All content and UI is in Spanish.

## Running

No build step, no dependencies. Open `demo/index.html` directly in a modern browser. Uses ES modules (`type="module"`).

## Architecture

Pure client-side vanilla JS organized as:

```
demo/
  index.html          — Single-page layout, all CSS inline, loads main.js as module
  js/
    geometry.js       — Pure math: parabolaY, parabolaIntersections, circumcircle
    fortune.js        — Algorithm state computation (beach line, edges, events, BST)
    renderer.js       — Canvas 2D drawing (layered: grid → edges → parabolas → beach → sweep → sites)
    dataStructViz.js  — Right panel: BST tree + event queue (HTML/Canvas)
    main.js           — App class: state management, presets, auto-sweep loop
    ui.js             — User input: drag sweep line, click/right-click sites, keyboard, buttons
```

**Data flow:** User input → `App` updates `sweepY`/`sites` → `precomputeFortune()` (cached on site change) → `computeState(sweepY)` → `Renderer` + `DataStructViz` draw.

## Key Conventions

- **Canvas coordinates**: y increases downward. Sweep line descends (increasing y). Parabolas open upward on screen (∩ shape) via `y = (fy + sweepY)/2 - (x - fx)² / (2*(sweepY - fy))`.
- **Beach line**: Lower envelope = MAX y among active parabolas (computed by sampling).
- **`precomputeFortune()`** returns `{ siteEvents, edges, vertexData }`. Edges have types: `finite`, `half-infinite`, `infinite`, each with `creationY` for progressive reveal.
- **`computeState()`** is the main per-frame function. Returns `{ arcs, breakpoints, completedEdges, tracedEdges, upcomingCircles, canceledCircles, bstStructure, eventQueue, processedEvents, pendingEvents }`.
- **Circle events**: Generated only from consecutive arc triples on the current beach line (faithful to Fortune's algorithm). Convergence-checked via breakpoint gap measurement.
- **False alarms**: Detected by comparing beach line before/after site events. Shown subtly (gray fading, not red) in both canvas and queue.
- **Color scheme**: sites=#2563EB, beachLine=#F59E0B, sweepLine=#EF4444, edges=#059669, circles=#8B5CF6, breakpoints=#111827.

## Reference Material

- `Fortune_s_Voronoi_Algorithm.pdf` — Student slides
- `Computational Geometry - Algorithms and Applications, 3rd EdVoronoi.pdf` — Textbook Chapter 7
- `slides_images/` — Extracted slide PNGs
