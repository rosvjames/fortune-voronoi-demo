// fortune.js - Compute algorithmic state for a given sweep line position
import { parabolaY, parabolaIntersections, circumcircle } from './geometry.js';

/**
 * Compute the beach line (lower envelope) for active sites.
 * In canvas coords (y-down), the beach line is the MAXIMUM y at each x.
 */
export function computeBeachLine(sites, sweepY, canvasWidth) {
    const activeSites = sites.filter(s => s.y < sweepY - 1e-6);
    if (activeSites.length === 0) return { arcs: [], breakpoints: [] };

    if (activeSites.length === 1) {
        return {
            arcs: [{ site: activeSites[0], xLeft: 0, xRight: canvasWidth }],
            breakpoints: []
        };
    }

    const step = 1;
    const ownership = [];

    for (let x = 0; x <= canvasWidth; x += step) {
        let maxY = -Infinity;
        let maxIdx = 0;
        for (let i = 0; i < activeSites.length; i++) {
            const y = parabolaY(activeSites[i], sweepY, x);
            if (y > maxY) { maxY = y; maxIdx = i; }
        }
        ownership.push(maxIdx);
    }

    const arcs = [];
    const breakpoints = [];
    let currentOwner = ownership[0];
    let arcStart = 0;

    for (let i = 1; i < ownership.length; i++) {
        if (ownership[i] !== currentOwner) {
            const xLeft = arcStart * step;
            const xRight = i * step;
            arcs.push({ site: activeSites[currentOwner], xLeft, xRight });

            const s1 = activeSites[currentOwner];
            const s2 = activeSites[ownership[i]];
            const intersections = parabolaIntersections(s1, s2, sweepY);

            let bpX = (xLeft + xRight) / 2;
            if (intersections.length > 0) {
                const midX = (xLeft + xRight) / 2;
                let bestDist = Infinity;
                for (const ix of intersections) {
                    const dist = Math.abs(ix - midX);
                    if (dist < bestDist) { bestDist = dist; bpX = ix; }
                }
            }

            const bpY = parabolaY(s1, sweepY, bpX);
            breakpoints.push({ x: bpX, y: bpY, siteLeft: s1, siteRight: s2 });

            currentOwner = ownership[i];
            arcStart = i;
        }
    }

    arcs.push({
        site: activeSites[currentOwner],
        xLeft: arcStart * step,
        xRight: canvasWidth
    });

    return { arcs, breakpoints };
}

/**
 * Precompute the full Voronoi diagram: vertices, edges, and site events.
 */
export function precomputeFortune(sites) {
    if (sites.length < 2) return { siteEvents: [], edges: [], vertexData: [] };

    const siteEvents = sites.map(s => ({ type: 'site', y: s.y, site: s }));
    siteEvents.sort((a, b) => a.y - b.y);

    const vertexData = [];
    const n = sites.length;

    // Find valid Voronoi vertices (circumcenters of empty circles)
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            for (let k = j + 1; k < n; k++) {
                const cc = circumcircle(sites[i], sites[j], sites[k]);
                if (!cc) continue;

                let empty = true;
                for (let m = 0; m < n; m++) {
                    if (m === i || m === j || m === k) continue;
                    const dx = sites[m].x - cc.center.x;
                    const dy = sites[m].y - cc.center.y;
                    if (dx * dx + dy * dy < cc.radius * cc.radius - 1e-4) {
                        empty = false;
                        break;
                    }
                }

                if (empty) {
                    vertexData.push({
                        center: cc.center,
                        radius: cc.radius,
                        sites: [sites[i], sites[j], sites[k]],
                        bottomY: cc.center.y + cc.radius
                    });
                }
            }
        }
    }

    // Compute Voronoi edges
    const edges = computeVoronoiEdges(sites, vertexData, 2000);

    return { siteEvents, edges, vertexData };
}

/**
 * Compute Voronoi edges from vertices.
 */
function computeVoronoiEdges(sites, vertexData, bound) {
    const edges = [];
    const n = sites.length;
    if (n < 2) return edges;

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const s1 = sites[i], s2 = sites[j];
            const midX = (s1.x + s2.x) / 2;
            const midY = (s1.y + s2.y) / 2;
            const dx = s2.x - s1.x, dy = s2.y - s1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1e-10) continue;
            const nx = -dy / len, ny = dx / len;

            const onBisector = [];
            for (const vd of vertexData) {
                const v = vd.center;
                const d1 = Math.sqrt((v.x - s1.x) ** 2 + (v.y - s1.y) ** 2);
                const d2 = Math.sqrt((v.x - s2.x) ** 2 + (v.y - s2.y) ** 2);
                if (Math.abs(d1 - d2) < 1e-3) {
                    const t = (v.x - midX) * nx + (v.y - midY) * ny;
                    onBisector.push({ vertex: { ...v }, t, bottomY: vd.bottomY });
                }
            }

            const dTest = Math.sqrt((midX - s1.x) ** 2 + (midY - s1.y) ** 2);
            let isNearest = true;
            for (let k = 0; k < n; k++) {
                if (k === i || k === j) continue;
                const dk = Math.sqrt((midX - sites[k].x) ** 2 + (midY - sites[k].y) ** 2);
                if (dk < dTest - 1e-4) { isNearest = false; break; }
            }

            if (!isNearest && onBisector.length === 0) continue;

            onBisector.sort((a, b) => a.t - b.t);

            const isValidDir = (vx, vy) => {
                const dt = Math.sqrt((vx - s1.x) ** 2 + (vy - s1.y) ** 2);
                for (let k = 0; k < n; k++) {
                    if (k === i || k === j) continue;
                    if (Math.sqrt((vx - sites[k].x) ** 2 + (vy - sites[k].y) ** 2) < dt - 1e-3) return false;
                }
                return true;
            };

            if (onBisector.length === 0) {
                if (isNearest) {
                    edges.push({
                        start: { x: midX - nx * bound, y: midY - ny * bound },
                        end: { x: midX + nx * bound, y: midY + ny * bound },
                        sites: [s1, s2], type: 'infinite',
                        creationY: Math.max(s1.y, s2.y)
                    });
                }
            } else if (onBisector.length === 1) {
                const v = onBisector[0].vertex;
                for (const dir of [1, -1]) {
                    if (isValidDir(v.x + nx * dir * 50, v.y + ny * dir * 50)) {
                        edges.push({
                            start: { ...v },
                            end: { x: v.x + nx * dir * bound, y: v.y + ny * dir * bound },
                            sites: [s1, s2], type: 'half-infinite',
                            creationY: onBisector[0].bottomY
                        });
                    }
                }
            } else {
                for (let k = 0; k < onBisector.length - 1; k++) {
                    const mx = (onBisector[k].vertex.x + onBisector[k + 1].vertex.x) / 2;
                    const my = (onBisector[k].vertex.y + onBisector[k + 1].vertex.y) / 2;
                    if (isValidDir(mx, my)) {
                        edges.push({
                            start: { ...onBisector[k].vertex },
                            end: { ...onBisector[k + 1].vertex },
                            sites: [s1, s2], type: 'finite',
                            creationY: Math.max(onBisector[k].bottomY, onBisector[k + 1].bottomY)
                        });
                    }
                }
                for (const [idx, dir] of [[0, -1], [onBisector.length - 1, 1]]) {
                    const v = onBisector[idx].vertex;
                    if (isValidDir(v.x + nx * dir * 50, v.y + ny * dir * 50)) {
                        edges.push({
                            start: { ...v },
                            end: { x: v.x + nx * dir * bound, y: v.y + ny * dir * bound },
                            sites: [s1, s2], type: 'half-infinite',
                            creationY: onBisector[idx].bottomY
                        });
                    }
                }
            }
        }
    }

    return edges;
}

/**
 * For a breakpoint, compute the traced edge segment from its current position
 * backward along the bisector to the nearest processed vertex or canvas boundary.
 */
function computeTracedEdge(bp, vertexData, sweepY) {
    const s1 = bp.siteLeft, s2 = bp.siteRight;
    const dx = s2.x - s1.x, dy = s2.y - s1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-10) return null;
    const nx = -dy / len, ny = dx / len;

    // Determine trail direction: compute bp position at sweepY-15 to see where it came from
    const prevSweepY = sweepY - 15;
    if (prevSweepY <= Math.max(s1.y, s2.y) + 1) return null;

    const prevIntersections = parabolaIntersections(s1, s2, prevSweepY);
    if (prevIntersections.length === 0) return null;

    // Find which previous intersection is closest to current bp
    let prevBpX = prevIntersections[0];
    let bestDist = Math.abs(prevBpX - bp.x);
    for (let k = 1; k < prevIntersections.length; k++) {
        const d = Math.abs(prevIntersections[k] - bp.x);
        if (d < bestDist) { bestDist = d; prevBpX = prevIntersections[k]; }
    }
    const prevBpY = parabolaY(s1, prevSweepY, prevBpX);

    // Trail goes from current bp TOWARD prev bp (opposite of movement)
    const trailDx = prevBpX - bp.x;
    const trailDy = prevBpY - bp.y;
    const trailProj = trailDx * nx + trailDy * ny;
    const dir = trailProj > 0 ? 1 : -1;

    // Find the nearest processed vertex in the trail direction on this bisector
    let endX = bp.x + nx * dir * 2000;
    let endY = bp.y + ny * dir * 2000;
    let minDist = Infinity;

    for (const vd of vertexData) {
        const v = vd.center;
        const d1 = Math.sqrt((v.x - s1.x) ** 2 + (v.y - s1.y) ** 2);
        const d2 = Math.sqrt((v.x - s2.x) ** 2 + (v.y - s2.y) ** 2);
        if (Math.abs(d1 - d2) > 1e-3) continue;

        // Is it in the trail direction?
        const vProj = (v.x - bp.x) * nx + (v.y - bp.y) * ny;
        if ((dir > 0 && vProj > 0.5) || (dir < 0 && vProj < -0.5)) {
            if (vd.bottomY <= sweepY) {
                const vDist = Math.abs(vProj);
                if (vDist < minDist) {
                    minDist = vDist;
                    endX = v.x;
                    endY = v.y;
                }
            }
        }
    }

    return {
        start: { x: bp.x, y: bp.y },
        end: { x: endX, y: endY },
        sites: [s1, s2],
        type: 'traced'
    };
}

/**
 * Generate circle events from CONSECUTIVE triples on the current beach line.
 * This is faithful to how Fortune's algorithm actually predicts circle events.
 *
 * Also checks convergence: breakpoints must be moving toward each other.
 */
function computeCircleEventsFromBeachLine(arcs, sweepY) {
    const validCircles = [];

    if (arcs.length < 3) return validCircles;

    for (let i = 0; i < arcs.length - 2; i++) {
        const s1 = arcs[i].site;
        const s2 = arcs[i + 1].site;
        const s3 = arcs[i + 2].site;

        // Skip if any two are the same site
        if (s1.id === s2.id || s2.id === s3.id || s1.id === s3.id) continue;

        const cc = circumcircle(s1, s2, s3);
        if (!cc) continue;

        const bottomY = cc.center.y + cc.radius;

        // Only show if event is below current sweep (pending)
        if (bottomY <= sweepY) continue;

        // Check convergence: the breakpoints between (s1,s2) and (s2,s3) must converge
        // We check this by computing breakpoint positions at sweepY and sweepY+5
        const futureSweep = sweepY + 5;
        const bp12_now = parabolaIntersections(s1, s2, sweepY);
        const bp23_now = parabolaIntersections(s2, s3, sweepY);
        const bp12_future = parabolaIntersections(s1, s2, futureSweep);
        const bp23_future = parabolaIntersections(s2, s3, futureSweep);

        if (bp12_now.length === 0 || bp23_now.length === 0) continue;
        if (bp12_future.length === 0 || bp23_future.length === 0) continue;

        // Pick the relevant intersections (closest to the arc boundaries)
        const midArc = (arcs[i + 1].xLeft + arcs[i + 1].xRight) / 2;

        const pickClosest = (arr, target) => {
            let best = arr[0], bestD = Math.abs(arr[0] - target);
            for (let k = 1; k < arr.length; k++) {
                const d = Math.abs(arr[k] - target);
                if (d < bestD) { best = arr[k]; bestD = d; }
            }
            return best;
        };

        const left_now = pickClosest(bp12_now, arcs[i + 1].xLeft);
        const right_now = pickClosest(bp23_now, arcs[i + 1].xRight);
        const left_future = pickClosest(bp12_future, arcs[i + 1].xLeft);
        const right_future = pickClosest(bp23_future, arcs[i + 1].xRight);

        const gap_now = right_now - left_now;
        const gap_future = right_future - left_future;

        // Converging = gap is shrinking
        if (gap_future < gap_now) {
            validCircles.push({
                type: 'circle',
                y: bottomY,
                sites: [s1, s2, s3],
                center: cc.center,
                radius: cc.radius,
                middleArc: s2,
                isFalseAlarm: false
            });
        }
    }

    return validCircles;
}

/**
 * Detect false alarms by comparing circle events at current sweepY vs sweepY-epsilon.
 * A false alarm = an event that existed in Q before but was removed because
 * a site event broke the consecutive triple.
 */
function detectFalseAlarms(arcs, sweepY, sites, canvasWidth, recentSiteEvents) {
    const canceledEvents = [];

    // Check if any site event just happened (within last 20px of sweep)
    const recentSites = recentSiteEvents.filter(e => e.y > sweepY - 25 && e.y <= sweepY);
    if (recentSites.length === 0) return canceledEvents;

    // For each recent site event, check if it broke any triple that had a valid circle event
    // We approximate this by computing the beach line slightly before the site event
    for (const siteEvent of recentSites) {
        const beforeSweep = siteEvent.y - 0.5;
        if (beforeSweep < 10) continue;

        const beforeResult = computeBeachLine(sites, beforeSweep, canvasWidth);
        const beforeCircles = computeCircleEventsFromBeachLine(beforeResult.arcs, beforeSweep);

        // Check which of those circles are NOT present in the current beach line
        const currentCircles = computeCircleEventsFromBeachLine(arcs, sweepY);

        for (const bc of beforeCircles) {
            const stillExists = currentCircles.some(cc =>
                Math.abs(cc.center.x - bc.center.x) < 2 &&
                Math.abs(cc.center.y - bc.center.y) < 2
            );

            if (!stillExists) {
                canceledEvents.push({
                    ...bc,
                    isFalseAlarm: true,
                    canceledBy: siteEvent.site,
                    fadeProgress: (sweepY - siteEvent.y) / 25 // 0 to 1 for fading
                });
            }
        }
    }

    return canceledEvents;
}

/**
 * Compute the full visualization state for a given sweep line position.
 */
export function computeState(sites, sweepY, canvasWidth, precomputed) {
    const activeSites = sites.filter(s => s.y < sweepY - 1e-6);
    const { arcs, breakpoints } = computeBeachLine(sites, sweepY, canvasWidth);

    // ── Site events ──
    const processedSiteEvents = precomputed.siteEvents.filter(e => e.y <= sweepY);
    const pendingSiteEvents = precomputed.siteEvents.filter(e => e.y > sweepY);

    // ── Circle events from consecutive triples (faithful to algorithm) ──
    const validCircleEvents = computeCircleEventsFromBeachLine(arcs, sweepY);

    // ── False alarms: recently canceled events ──
    const canceledEvents = detectFalseAlarms(arcs, sweepY, sites, canvasWidth, precomputed.siteEvents);

    // ── Edges: show ALL types when their creationY <= sweepY ──
    const completedEdges = precomputed.edges.filter(edge => edge.creationY <= sweepY);

    // ── Traced edges from breakpoints ──
    const tracedEdges = [];
    for (const bp of breakpoints) {
        const traced = computeTracedEdge(bp, precomputed.vertexData, sweepY);
        if (traced) tracedEdges.push(traced);
    }

    // ── Build BST ──
    const bstStructure = buildBSTFromArcs(arcs);

    // ── Build event queue (site events + valid circle events, sorted by y) ──
    const allPending = [
        ...pendingSiteEvents.map(e => ({
            type: 'site', y: e.y,
            label: `Site s${e.site.id} (${Math.round(e.site.x)}, ${Math.round(e.site.y)})`,
            sites: [e.site], isFalseAlarm: false
        })),
        ...validCircleEvents.map(e => ({
            type: 'circle', y: e.y,
            label: `Circle s${e.sites[0].id},s${e.sites[1].id},s${e.sites[2].id}`,
            sites: e.sites, isFalseAlarm: false
        })),
        ...canceledEvents.filter(e => e.fadeProgress < 1).map(e => ({
            type: 'circle', y: e.y,
            label: `Circle s${e.sites[0].id},s${e.sites[1].id},s${e.sites[2].id}`,
            sites: e.sites, isFalseAlarm: true,
            canceledBy: e.canceledBy,
            fadeProgress: e.fadeProgress
        }))
    ];
    allPending.sort((a, b) => a.y - b.y);

    // ── Processed events count ──
    const processedCircleEvents = precomputed.vertexData.filter(v => v.bottomY <= sweepY);
    const processedEvents = [
        ...processedSiteEvents,
        ...processedCircleEvents.map(v => ({ type: 'circle', y: v.bottomY }))
    ];

    return {
        activeSites,
        arcs,
        breakpoints,
        completedEdges,
        tracedEdges,
        upcomingCircles: validCircleEvents,
        canceledCircles: canceledEvents.filter(e => e.fadeProgress < 1),
        processedEvents,
        pendingEvents: allPending,
        bstStructure,
        eventQueue: allPending
    };
}

/**
 * Build BST from arcs.
 */
function buildBSTFromArcs(arcs) {
    if (arcs.length === 0) return null;

    const leaves = arcs.map(arc => ({
        type: 'leaf', label: `s${arc.site.id}`, site: arc.site
    }));

    if (leaves.length === 1) return leaves[0];

    function buildTree(nodes) {
        if (nodes.length === 1) return nodes[0];
        if (nodes.length === 2) {
            const lSite = nodes[0].site || nodes[0].rightmostSite;
            const rSite = nodes[1].site || nodes[1].leftmostSite;
            return {
                type: 'internal',
                label: `⟨s${lSite.id},s${rSite.id}⟩`,
                left: nodes[0], right: nodes[1],
                leftmostSite: nodes[0].site || nodes[0].leftmostSite,
                rightmostSite: nodes[1].site || nodes[1].rightmostSite
            };
        }
        const mid = Math.floor(nodes.length / 2);
        const left = buildTree(nodes.slice(0, mid));
        const right = buildTree(nodes.slice(mid));
        const lSite = left.rightmostSite || left.site;
        const rSite = right.leftmostSite || right.site;
        return {
            type: 'internal',
            label: `⟨s${lSite.id},s${rSite.id}⟩`,
            left, right,
            leftmostSite: left.leftmostSite || left.site,
            rightmostSite: right.rightmostSite || right.site
        };
    }

    return buildTree(leaves);
}
