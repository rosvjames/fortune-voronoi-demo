// main.js - App initialization and state management
import { Renderer } from './renderer.js';
import { DataStructViz } from './dataStructViz.js';
import { computeState, precomputeFortune } from './fortune.js';
import { UI } from './ui.js';

class App {
    constructor() {
        this.canvas = document.getElementById('main-canvas');
        this.resizeCanvas();

        this.renderer = new Renderer(this.canvas);
        this.dataViz = new DataStructViz(
            document.getElementById('bst-canvas'),
            document.getElementById('queue-container')
        );

        this.sites = [];
        this.nextSiteId = 1;
        this.sweepY = 50;
        this.precomputed = { siteEvents: [], edges: [], vertexData: [] };
        this.autoSweeping = false;
        this.autoSweepSpeed = 1;

        this.ui = new UI(this.canvas, this);

        // Start with a preset
        this.loadPreset('circle-event');

        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.recompute();
            this.update();
        });
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    addSite(x, y) {
        this.sites.push({ x, y, id: this.nextSiteId++ });
        this.recompute();
        this.update();
    }

    removeSiteNear(x, y) {
        if (this.sites.length === 0) return;

        let minDist = Infinity;
        let minIdx = -1;
        for (let i = 0; i < this.sites.length; i++) {
            const dx = this.sites[i].x - x;
            const dy = this.sites[i].y - y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                minIdx = i;
            }
        }

        if (minIdx >= 0 && minDist < 400) { // within 20px
            this.sites.splice(minIdx, 1);
            this.recompute();
            this.update();
        }
    }

    clearSites() {
        this.sites = [];
        this.nextSiteId = 1;
        this.precomputed = { siteEvents: [], edges: [], vertexData: [] };
        this.update();
    }

    randomSites() {
        this.sites = [];
        this.nextSiteId = 1;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const margin = 60;
        const count = 5 + Math.floor(Math.random() * 6); // 5-10

        for (let i = 0; i < count; i++) {
            this.sites.push({
                x: margin + Math.random() * (w - 2 * margin),
                y: margin + Math.random() * (h - 2 * margin),
                id: this.nextSiteId++
            });
        }

        this.sweepY = 50;
        this.recompute();
        this.update();
    }

    loadPreset(name) {
        this.sites = [];
        this.nextSiteId = 1;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        switch (name) {
            case 'triangle':
                this.sites = [
                    { x: cx - 150, y: cy - 100, id: this.nextSiteId++ },
                    { x: cx + 150, y: cy - 80, id: this.nextSiteId++ },
                    { x: cx, y: cy + 80, id: this.nextSiteId++ },
                ];
                break;

            case 'circle-event':
                // 4 sites arranged so circle events are clearly visible
                this.sites = [
                    { x: cx - 120, y: cy - 120, id: this.nextSiteId++ },
                    { x: cx + 120, y: cy - 100, id: this.nextSiteId++ },
                    { x: cx, y: cy - 20, id: this.nextSiteId++ },
                    { x: cx + 60, y: cy + 100, id: this.nextSiteId++ },
                ];
                break;

            case 'collinear':
                this.sites = [
                    { x: cx - 200, y: cy, id: this.nextSiteId++ },
                    { x: cx, y: cy, id: this.nextSiteId++ },
                    { x: cx + 200, y: cy, id: this.nextSiteId++ },
                ];
                break;

            default:
                break;
        }

        this.sweepY = 50;
        this.recompute();
        this.update();
    }

    recompute() {
        this.precomputed = precomputeFortune(this.sites);
    }

    update() {
        const state = computeState(
            this.sites,
            this.sweepY,
            this.canvas.width,
            this.precomputed
        );

        this.renderer.render(state, this.sites, this.sweepY);
        this.dataViz.render(state);

        // Update event info display
        this._updateEventInfo(state);
    }

    _updateEventInfo(state) {
        const info = document.getElementById('event-info');
        if (!info) return;

        const nextEvent = state.pendingEvents.length > 0 ? state.pendingEvents[0] : null;
        const lastProcessed = state.processedEvents.length > 0
            ? state.processedEvents[state.processedEvents.length - 1]
            : null;

        let html = '';
        if (lastProcessed) {
            const icon = lastProcessed.type === 'site' ? '＋' : '○';
            const typeLabel = lastProcessed.type === 'site' ? 'Sitio' : 'Círculo';
            html += `<div class="event-last">Último: ${icon} ${typeLabel} en y=${Math.round(lastProcessed.y)}</div>`;
        }
        if (nextEvent) {
            const icon = nextEvent.type === 'site' ? '＋' : '○';
            const typeLabel = nextEvent.type === 'site' ? 'Sitio' : 'Círculo';
            html += `<div class="event-next">Próximo: ${icon} ${typeLabel} en y=${Math.round(nextEvent.y)}</div>`;
        }
        html += `<div class="event-stats">Arcos: ${state.arcs.length} | BPs: ${state.breakpoints.length}</div>`;

        info.innerHTML = html;
    }

    toggleAutoSweep() {
        this.autoSweeping = !this.autoSweeping;
        const btn = document.getElementById('btn-auto-sweep');
        if (btn) btn.textContent = this.autoSweeping ? '⏸ Pausar' : '▶ Auto';

        if (this.autoSweeping) {
            this._autoSweepLoop();
        }
    }

    _autoSweepLoop() {
        if (!this.autoSweeping) return;

        this.sweepY += this.autoSweepSpeed;
        if (this.sweepY >= this.canvas.height - 10) {
            this.autoSweeping = false;
            const btn = document.getElementById('btn-auto-sweep');
            if (btn) btn.textContent = '▶ Auto';
            return;
        }

        this.update();
        requestAnimationFrame(() => this._autoSweepLoop());
    }

    stepNextEvent() {
        // Get all event y-positions: site events + circle events (vertex bottomY)
        const allEventYs = [
            ...this.precomputed.siteEvents.map(e => e.y),
            ...this.precomputed.vertexData.map(v => v.bottomY)
        ].sort((a, b) => a - b);

        const nextY = allEventYs.find(y => y > this.sweepY + 1e-6);
        if (nextY !== undefined) {
            this.sweepY = nextY + 1;
            this.update();
        }
    }

    stepPrevEvent() {
        const allEventYs = [
            ...this.precomputed.siteEvents.map(e => e.y),
            ...this.precomputed.vertexData.map(v => v.bottomY)
        ].sort((a, b) => a - b);

        const processed = allEventYs.filter(y => y < this.sweepY - 1);
        if (processed.length > 0) {
            this.sweepY = processed[processed.length - 1] + 1;
            this.update();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
