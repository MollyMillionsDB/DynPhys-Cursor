// SPDX-License-Identifier: GPL-2.0-or-later
export const DEFAULTS = Object.freeze({
    mode: 'rotate', spring: 180, damping: 22, length: 70,
    sensitivity: 1, smoothing: 35, maxAngle: 100,
    tilt: 0.035, stretch: 0.12, restAngle: 45,
});
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Angles are radians internally, velocities logical pixels/second.
 * Hotspot translation is deliberately outside the simulation.
 */
export class CursorPhysics {
    constructor(options = {}) {
        this.configure(options);
        this.reset();
    }

    configure(options) {
        this.options = {...DEFAULTS, ...options};
    }

    reset() {
        this.angle = 0;
        this.omega = 0;
        this.vx = 0;
        this.vy = 0;
        this.stretch = 0;
    }

    step(dx, dy, elapsed) {
        if (![dx, dy, elapsed].every(Number.isFinite) || elapsed <= 0)
            return this.result();
        // Discontinuities (resume, pointer warps) must not inject huge impulses.
        if (elapsed > 0.1 || Math.hypot(dx, dy) > 500) {
            this.reset();
            return this.result();
        }
        const p = this.options;
        const vx = clamp(dx / elapsed, -12000, 12000);
        const vy = clamp(dy / elapsed, -12000, 12000);
        const n = Math.ceil(elapsed / (1 / 240));
        const dt = elapsed / n;
        const limit = p.maxAngle * Math.PI / 180;
        for (let i = 0; i < n; i++) {
            const blend = 1 - Math.exp(-dt / Math.max(0.001, p.smoothing / 1000));
            this.vx += (vx - this.vx) * blend;
            this.vy += (vy - this.vy) * blend;
            let force;
            if (p.mode === 'tilt') {
                const target = clamp(-this.vx * p.tilt * p.sensitivity,
                    -p.maxAngle, p.maxAngle) * Math.PI / 180;
                force = p.spring * (target - this.angle);
            } else {
                // The tail lies along restAngle. Perpendicular tip motion
                // pulls the tail around the anchored tip like a dragged rod.
                const a = this.angle + p.restAngle * Math.PI / 180;
                const drag = (this.vx * Math.sin(a) - this.vy * Math.cos(a)) /
                    p.length * p.sensitivity;
                force = p.damping * drag - p.spring * this.angle;
            }
            this.omega += (force - p.damping * this.omega) * dt;
            this.angle = clamp(this.angle + this.omega * dt, -limit, limit);
            if (Math.abs(this.angle) >= limit && this.angle * this.omega > 0)
                this.omega = 0;
            const targetStretch = Math.min(0.6, Math.hypot(this.vx, this.vy) / 1500 * p.stretch);
            this.stretch += (targetStretch - this.stretch) * (1 - Math.exp(-dt * 18));
        }
        return this.result();
    }

    result() {
        return {angle: this.angle * 180 / Math.PI, scaleX: 1 / Math.sqrt(1 + this.stretch),
            scaleY: 1 + this.stretch};
    }
}
