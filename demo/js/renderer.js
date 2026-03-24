// renderer.js - Canvas drawing for Fortune's algorithm visualization
import { parabolaY } from './geometry.js';

const COLORS = {
    background: '#FAFAFA',
    grid: '#E8E8E8',
    sites: '#2563EB',
    siteDimmed: 'rgba(37, 99, 235, 0.3)',
    siteLabel: '#1E40AF',
    parabolaFull: 'rgba(156, 163, 175, 0.3)',
    beachLine: '#F59E0B',
    beachLineFill: 'rgba(245, 158, 11, 0.08)',
    sweepLine: '#EF4444',
    voronoiEdge: '#059669',
    voronoiEdgePartial: 'rgba(52, 211, 153, 0.6)',
    circleEvent: '#8B5CF6',
    breakpoint: '#111827',
};

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.showParabolas = true;
        this.showBeachLine = true;
        this.showEdges = true;
        this.showCircleEvents = true;
    }

    clear() {
        const { ctx, canvas } = this;
        ctx.fillStyle = COLORS.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawGrid() {
        const { ctx, canvas } = this;
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 0.5;
        const spacing = 40;

        for (let x = spacing; x < canvas.width; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = spacing; y < canvas.height; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    drawSweepLine(sweepY) {
        const { ctx, canvas } = this;

        // Subtle fill below sweep line
        ctx.fillStyle = 'rgba(239, 68, 68, 0.03)';
        ctx.fillRect(0, sweepY, canvas.width, canvas.height - sweepY);

        // Sweep line
        ctx.strokeStyle = COLORS.sweepLine;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(0, sweepY);
        ctx.lineTo(canvas.width, sweepY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Drag handle
        ctx.fillStyle = COLORS.sweepLine;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, sweepY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, sweepY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = COLORS.sweepLine;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`ℓ (sweep line)`, 10, sweepY - 10);
        ctx.textAlign = 'right';
        ctx.fillText(`y = ${Math.round(sweepY)}`, canvas.width - 10, sweepY - 10);
    }

    drawSites(sites, sweepY) {
        const { ctx } = this;
        for (const site of sites) {
            const isActive = site.y < sweepY - 1e-6;

            // Site dot
            ctx.fillStyle = isActive ? COLORS.sites : COLORS.siteDimmed;
            ctx.beginPath();
            ctx.arc(site.x, site.y, 7, 0, Math.PI * 2);
            ctx.fill();

            // White center ring
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(site.x, site.y, 3.5, 0, Math.PI * 2);
            ctx.stroke();

            // Label
            ctx.fillStyle = isActive ? COLORS.siteLabel : 'rgba(30, 64, 175, 0.4)';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`s${site.id}`, site.x, site.y - 13);
        }
    }

    drawParabolas(sites, sweepY) {
        if (!this.showParabolas) return;
        const { ctx, canvas } = this;

        for (const site of sites) {
            if (site.y >= sweepY - 1e-6) continue;

            ctx.beginPath();
            let started = false;
            for (let x = 0; x <= canvas.width; x += 1) {
                const y = parabolaY(site, sweepY, x);
                // Only draw within reasonable bounds
                if (y < -200 || y > canvas.height + 200) {
                    started = false;
                    continue;
                }
                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.strokeStyle = COLORS.parabolaFull;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Draw focus-to-vertex dotted line
            const vertexY = (site.y + sweepY) / 2;
            ctx.strokeStyle = 'rgba(156, 163, 175, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(site.x, site.y);
            ctx.lineTo(site.x, vertexY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    drawBeachLine(arcs, sweepY) {
        if (!this.showBeachLine) return;
        const { ctx, canvas } = this;

        if (arcs.length === 0) return;

        // Draw beach line as thick colored curve
        ctx.beginPath();
        let started = false;

        for (const arc of arcs) {
            const xStart = Math.max(0, Math.floor(arc.xLeft));
            const xEnd = Math.min(canvas.width, Math.ceil(arc.xRight));
            for (let x = xStart; x <= xEnd; x += 1) {
                const y = parabolaY(arc.site, sweepY, x);
                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }

        // Fill area between beach line and sweep line (subtle)
        if (started) {
            ctx.lineTo(canvas.width, sweepY);
            ctx.lineTo(0, sweepY);
            ctx.closePath();
            ctx.fillStyle = COLORS.beachLineFill;
            ctx.fill();
        }

        // Redraw beach line stroke on top
        ctx.beginPath();
        started = false;
        for (const arc of arcs) {
            const xStart = Math.max(0, Math.floor(arc.xLeft));
            const xEnd = Math.min(canvas.width, Math.ceil(arc.xRight));
            for (let x = xStart; x <= xEnd; x += 1) {
                const y = parabolaY(arc.site, sweepY, x);
                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.strokeStyle = COLORS.beachLine;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    drawBreakpoints(breakpoints) {
        if (!this.showBeachLine) return;
        const { ctx } = this;

        for (const bp of breakpoints) {
            if (bp.x < -10 || bp.x > this.canvas.width + 10) continue;
            if (bp.y < -10 || bp.y > this.canvas.height + 10) continue;

            // Outer circle
            ctx.fillStyle = COLORS.breakpoint;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Inner dot
            ctx.fillStyle = COLORS.beachLine;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.fillStyle = '#6B7280';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(
                `⟨s${bp.siteLeft.id},s${bp.siteRight.id}⟩`,
                bp.x,
                bp.y + 15
            );
        }
    }

    drawVoronoiEdges(completedEdges, tracedEdges) {
        if (!this.showEdges) return;
        const { ctx, canvas } = this;

        // 1. Traced edges (being drawn by breakpoints in real-time)
        for (const edge of tracedEdges || []) {
            const clipped = clipLineToRect(
                edge.start.x, edge.start.y,
                edge.end.x, edge.end.y,
                -10, -10, canvas.width + 10, canvas.height + 10
            );
            if (!clipped) continue;

            ctx.beginPath();
            ctx.moveTo(clipped.x1, clipped.y1);
            ctx.lineTo(clipped.x2, clipped.y2);
            ctx.strokeStyle = COLORS.voronoiEdge;
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.stroke();

            // Glowing dot at the breakpoint end (the "pen" drawing the edge)
            ctx.fillStyle = COLORS.voronoiEdge;
            ctx.beginPath();
            ctx.arc(edge.start.x, edge.start.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Completed edges (both endpoints are processed vertices)
        for (const edge of completedEdges || []) {
            const clipped = clipLineToRect(
                edge.start.x, edge.start.y,
                edge.end.x, edge.end.y,
                -10, -10, canvas.width + 10, canvas.height + 10
            );
            if (!clipped) continue;

            ctx.beginPath();
            ctx.moveTo(clipped.x1, clipped.y1);
            ctx.lineTo(clipped.x2, clipped.y2);
            ctx.strokeStyle = COLORS.voronoiEdge;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([]);
            ctx.stroke();
        }

        // 3. Draw Voronoi vertices (at processed circle event centers)
        const drawnVertices = new Set();
        const allEdges = [...(completedEdges || []), ...(tracedEdges || [])];
        for (const edge of allEdges) {
            for (const pt of [edge.start, edge.end]) {
                const key = `${Math.round(pt.x * 5)},${Math.round(pt.y * 5)}`;
                if (drawnVertices.has(key)) continue;
                if (pt.x < -10 || pt.x > canvas.width + 10 || pt.y < -10 || pt.y > canvas.height + 10) continue;
                // Only draw if it looks like a vertex (not a canvas-boundary point)
                if (Math.abs(pt.x) > 1500 || Math.abs(pt.y) > 1500) continue;
                drawnVertices.add(key);

                ctx.fillStyle = COLORS.voronoiEdge;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFF';
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawCircleEvents(validCircles, canceledCircles) {
        if (!this.showCircleEvents) return;
        const { ctx } = this;

        // ── Draw canceled circles (fading out subtly) ──
        for (const ce of canceledCircles || []) {
            const fade = 1 - (ce.fadeProgress || 0);
            if (fade <= 0) continue;

            ctx.globalAlpha = fade * 0.3;
            ctx.strokeStyle = '#9CA3AF';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 5]);
            ctx.beginPath();
            ctx.arc(ce.center.x, ce.center.y, ce.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Small "cancelado" label
            ctx.fillStyle = '#9CA3AF';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('cancelado', ce.center.x, ce.center.y - ce.radius - 5);

            ctx.globalAlpha = 1.0;
        }

        // ── Draw valid circle events ──
        for (const ce of validCircles || []) {
            const color = COLORS.circleEvent;

            // Circumscribed circle
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(ce.center.x, ce.center.y, ce.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Subtle fill
            ctx.fillStyle = 'rgba(139, 92, 246, 0.04)';
            ctx.beginPath();
            ctx.arc(ce.center.x, ce.center.y, ce.radius, 0, Math.PI * 2);
            ctx.fill();

            // Center point (= future Voronoi vertex)
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(ce.center.x, ce.center.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(ce.center.x, ce.center.y, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Bottom of circle (trigger point)
            const bottomY = ce.center.y + ce.radius;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(ce.center.x, bottomY, 4, 0, Math.PI * 2);
            ctx.fill();

            // Labels
            ctx.fillStyle = color;
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('→ vértice', ce.center.x + 35, ce.center.y + 4);
            ctx.fillText(`evento ↓ y=${Math.round(bottomY)}`, ce.center.x, bottomY + 14);

            // Lines from center to each defining site
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            for (const s of ce.sites) {
                ctx.beginPath();
                ctx.moveTo(ce.center.x, ce.center.y);
                ctx.lineTo(s.x, s.y);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }
    }

    render(state, sites, sweepY) {
        this.clear();
        this.drawGrid();
        this.drawVoronoiEdges(state.completedEdges, state.tracedEdges);
        this.drawParabolas(sites, sweepY);
        this.drawBeachLine(state.arcs, sweepY);
        this.drawBreakpoints(state.breakpoints);
        this.drawCircleEvents(state.upcomingCircles || [], state.canceledCircles || []);
        this.drawSweepLine(sweepY);
        this.drawSites(sites, sweepY);
    }
}

/**
 * Clip a line segment to a rectangle using Cohen-Sutherland.
 * Returns {x1, y1, x2, y2} or null if fully outside.
 */
function clipLineToRect(x1, y1, x2, y2, xmin, ymin, xmax, ymax) {
    const INSIDE = 0, LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;

    function code(x, y) {
        let c = INSIDE;
        if (x < xmin) c |= LEFT;
        else if (x > xmax) c |= RIGHT;
        if (y < ymin) c |= TOP;
        else if (y > ymax) c |= BOTTOM;
        return c;
    }

    let c1 = code(x1, y1), c2 = code(x2, y2);

    for (let i = 0; i < 20; i++) {
        if (!(c1 | c2)) return { x1, y1, x2, y2 };
        if (c1 & c2) return null;

        const cout = c1 || c2;
        let x, y;
        if (cout & BOTTOM) { x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1); y = ymax; }
        else if (cout & TOP) { x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1); y = ymin; }
        else if (cout & RIGHT) { y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1); x = xmax; }
        else if (cout & LEFT) { y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1); x = xmin; }

        if (cout === c1) { x1 = x; y1 = y; c1 = code(x1, y1); }
        else { x2 = x; y2 = y; c2 = code(x2, y2); }
    }

    return { x1, y1, x2, y2 };
}
