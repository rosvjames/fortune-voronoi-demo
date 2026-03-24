// geometry.js - Core mathematics for Fortune's algorithm visualization
// All functions are pure (no state)
// Canvas convention: y increases downward, sweep line moves downward (increasing y)

/**
 * Compute the y-coordinate of a parabola at a given x.
 * Focus = site (fx, fy), Directrix = y = sweepY.
 * Active when sweepY > site.y.
 *
 * Derivation: equidistant from focus and directrix
 *   sqrt((x-fx)^2 + (y-fy)^2) = sweepY - y   (for y < sweepY)
 *   (x-fx)^2 + (y-fy)^2 = (sweepY - y)^2
 *   Solving for y:
 *   y = (fy + sweepY)/2 - (x - fx)^2 / (2*(sweepY - fy))
 *
 * The parabola opens UPWARD on screen (∩ shape):
 *  - Vertex at x=fx, y = (fy + sweepY)/2 (between site and sweep)
 *  - Arms curve up (toward smaller y) as |x - fx| grows
 */
export function parabolaY(site, sweepY, x) {
    const d = sweepY - site.y;
    if (d < 1e-10) {
        // Degenerate: site is on or below the sweep line
        return site.y;
    }
    return (site.y + sweepY) / 2 - ((x - site.x) * (x - site.x)) / (2 * d);
}

/**
 * Find x-coordinates where two parabolas intersect.
 * Returns array of x values (0, 1, or 2 solutions), sorted ascending.
 *
 * Parabola i: y = (fy_i + d)/2 - (x - fx_i)^2 / (2*(d - fy_i))
 * where d = sweepY
 */
export function parabolaIntersections(s1, s2, sweepY) {
    const d1 = sweepY - s1.y;
    const d2 = sweepY - s2.y;

    // Both degenerate
    if (d1 < 1e-10 && d2 < 1e-10) {
        return [];
    }

    // s1 degenerate (on sweep line) -> intersection at x = s1.x on s2's parabola
    if (d1 < 1e-10) {
        return [s1.x];
    }

    // s2 degenerate
    if (d2 < 1e-10) {
        return [s2.x];
    }

    // Same y-coordinate -> single intersection at midpoint x
    if (Math.abs(s1.y - s2.y) < 1e-10) {
        return [(s1.x + s2.x) / 2];
    }

    // General case: set parabola1 = parabola2 and solve for x
    // y1 = (s1.y + sweepY)/2 - (x - s1.x)^2 / (2*d1)
    // y2 = (s2.y + sweepY)/2 - (x - s2.x)^2 / (2*d2)
    // y1 = y2  =>  rearrange to ax^2 + bx + c = 0
    const a1 = -1 / (2 * d1);
    const a2 = -1 / (2 * d2);
    const b1 = s1.x / d1;
    const b2 = s2.x / d2;
    const c1 = -(s1.x * s1.x) / (2 * d1) + (s1.y + sweepY) / 2;
    const c2 = -(s2.x * s2.x) / (2 * d2) + (s2.y + sweepY) / 2;

    const a = a1 - a2;
    const b = b1 - b2;
    const c = c1 - c2;

    if (Math.abs(a) < 1e-10) {
        if (Math.abs(b) < 1e-10) return [];
        return [-c / b];
    }

    const disc = b * b - 4 * a * c;
    if (disc < -1e-10) return [];
    if (disc < 1e-10) return [-b / (2 * a)];

    const sqrtDisc = Math.sqrt(Math.max(0, disc));
    const x1 = (-b - sqrtDisc) / (2 * a);
    const x2 = (-b + sqrtDisc) / (2 * a);
    return x1 < x2 ? [x1, x2] : [x2, x1];
}

/**
 * Compute circumcircle of three points.
 * Returns { center: {x, y}, radius } or null if collinear.
 */
export function circumcircle(p1, p2, p3) {
    const ax = p1.x, ay = p1.y;
    const bx = p2.x, by = p2.y;
    const cx = p3.x, cy = p3.y;

    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(D) < 1e-10) return null;

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D;

    const radius = Math.sqrt((ax - ux) * (ax - ux) + (ay - uy) * (ay - uy));

    return { center: { x: ux, y: uy }, radius };
}

/**
 * Returns the y-coordinate of the bottom of the circumcircle (center.y + radius).
 * In canvas coords (y-down), "bottom" = largest y.
 * This is the sweepY at which the circle event triggers.
 */
export function circleBottomY(p1, p2, p3) {
    const cc = circumcircle(p1, p2, p3);
    if (!cc) return Infinity;
    return cc.center.y + cc.radius;
}
