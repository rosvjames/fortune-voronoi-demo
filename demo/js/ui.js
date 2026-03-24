// ui.js - User interaction: sweep line drag, site placement, controls

export class UI {
    constructor(canvas, app) {
        this.canvas = canvas;
        this.app = app;
        this.isDragging = false;
        this.dragThreshold = 15; // px near sweep line to start drag

        this._setupSweepDrag();
        this._setupSitePlacement();
        this._setupControls();
        this._setupKeyboard();
    }

    _setupSweepDrag() {
        const canvas = this.canvas;

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const y = e.clientY - rect.top;

            if (Math.abs(y - this.app.sweepY) < this.dragThreshold) {
                this.isDragging = true;
                canvas.style.cursor = 'ns-resize';
                e.preventDefault();
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const y = e.clientY - rect.top;

            if (this.isDragging) {
                this.app.sweepY = Math.max(10, Math.min(canvas.height - 10, y));
                this.app.update();
                e.preventDefault();
            } else {
                // Show resize cursor when near sweep line
                if (Math.abs(y - this.app.sweepY) < this.dragThreshold) {
                    canvas.style.cursor = 'ns-resize';
                } else {
                    canvas.style.cursor = 'crosshair';
                }
            }
        });

        const stopDrag = () => {
            this.isDragging = false;
            canvas.style.cursor = 'crosshair';
        };
        canvas.addEventListener('mouseup', stopDrag);
        canvas.addEventListener('mouseleave', stopDrag);
    }

    _setupSitePlacement() {
        this.canvas.addEventListener('click', (e) => {
            if (this.isDragging) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Don't place site near sweep line
            if (Math.abs(y - this.app.sweepY) < this.dragThreshold) return;

            this.app.addSite(x, y);
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.app.removeSiteNear(x, y);
        });
    }

    _setupControls() {
        // Clear all
        document.getElementById('btn-clear')?.addEventListener('click', () => {
            this.app.clearSites();
        });

        // Random sites
        document.getElementById('btn-random')?.addEventListener('click', () => {
            this.app.randomSites();
        });

        // Presets
        document.getElementById('btn-preset-triangle')?.addEventListener('click', () => {
            this.app.loadPreset('triangle');
        });
        document.getElementById('btn-preset-circle-event')?.addEventListener('click', () => {
            this.app.loadPreset('circle-event');
        });
        document.getElementById('btn-preset-collinear')?.addEventListener('click', () => {
            this.app.loadPreset('collinear');
        });

        // Toggles
        document.getElementById('toggle-parabolas')?.addEventListener('change', (e) => {
            this.app.renderer.showParabolas = e.target.checked;
            this.app.update();
        });
        document.getElementById('toggle-beachline')?.addEventListener('change', (e) => {
            this.app.renderer.showBeachLine = e.target.checked;
            this.app.update();
        });
        document.getElementById('toggle-edges')?.addEventListener('change', (e) => {
            this.app.renderer.showEdges = e.target.checked;
            this.app.update();
        });
        document.getElementById('toggle-circles')?.addEventListener('change', (e) => {
            this.app.renderer.showCircleEvents = e.target.checked;
            this.app.update();
        });

        // Auto-sweep
        document.getElementById('btn-auto-sweep')?.addEventListener('click', () => {
            this.app.toggleAutoSweep();
        });

        // Step buttons
        document.getElementById('btn-prev-event')?.addEventListener('click', () => {
            this.app.stepPrevEvent();
        });
        document.getElementById('btn-next-event')?.addEventListener('click', () => {
            this.app.stepNextEvent();
        });

        // Reset sweep
        document.getElementById('btn-reset-sweep')?.addEventListener('click', () => {
            this.app.sweepY = 10;
            this.app.update();
        });
    }

    _setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.app.sweepY = Math.min(this.canvas.height - 10, this.app.sweepY + 3);
                this.app.update();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.app.sweepY = Math.max(10, this.app.sweepY - 3);
                this.app.update();
            } else if (e.key === 'n' || e.key === 'N') {
                this.app.stepNextEvent();
            } else if (e.key === 'p' || e.key === 'P') {
                this.app.stepPrevEvent();
            }
        });
    }
}
