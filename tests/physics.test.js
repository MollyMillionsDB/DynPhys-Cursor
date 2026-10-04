// Run with gjs -m tests/physics.test.js
import {CursorPhysics} from '../physics.js';
function assert(condition, message) { if (!condition) throw new Error(message); }
function near(a, b, tolerance, message) { assert(Math.abs(a - b) < tolerance, `${message}: ${a} vs ${b}`); }
let passed = 0;
function test(name, fn) { fn(); print(`PASS ${name}`); passed++; }
test('rest stays at rest', () => {
    const p = new CursorPhysics();
    for (let i = 0; i < 1000; i++) p.step(0, 0, 1 / 60);
    near(p.result().angle, 0, 1e-10, 'rest angle');
});
test('drag direction and reversals', () => {
    const p = new CursorPhysics({stretch: 0});
    for (let i = 0; i < 60; i++) p.step(10, 0, 1 / 60);
    assert(p.result().angle > 0, 'rightward drag should rotate clockwise');
    for (let i = 0; i < 60; i++) p.step(-10, 0, 1 / 60);
    assert(p.result().angle < 0, 'leftward drag should rotate counterclockwise');
});
test('settles after stopping', () => {
    const p = new CursorPhysics();
    for (let i = 0; i < 40; i++) p.step(18, -10, 1 / 60);
    for (let i = 0; i < 180; i++) p.step(0, 0, 1 / 60);
    near(p.result().angle, 0, 0.01, 'angle after three seconds');
    near(p.result().scaleY, 1, 0.001, 'stretch after stopping');
});
test('similar trajectories at 30, 60, 144 Hz', () => {
    const run = hz => {
        const p = new CursorPhysics();
        for (let i = 0; i < hz; i++) p.step(600 / hz, -200 / hz, 1 / hz);
        return p.result().angle;
    };
    near(run(30), run(144), 1, 'frame rate independence');
    near(run(60), run(144), 1, 'frame rate independence');
});
test('extreme permitted settings stay finite and bounded', () => {
    for (const spring of [10, 800]) for (const damping of [2, 80]) {
        const p = new CursorPhysics({spring, damping, length: 10, sensitivity: 4,
            smoothing: 0, maxAngle: 35, stretch: 0.5});
        for (let i = 0; i < 4000; i++) {
            const s = p.step(i % 2 ? 400 : -400, 20, 1 / 30);
            assert(Number.isFinite(s.angle) && Math.abs(s.angle) <= 35.000001, 'angle bound');
            assert(s.scaleY >= 1 && s.scaleY <= 1.6, 'stretch bound');
        }
    }
});
test('pause gaps and warps reset without impulse', () => {
    const p = new CursorPhysics();
    p.step(20, 0, 1 / 60); p.step(0, 0, 1);
    near(p.result().angle, 0, 1e-10, 'gap');
    p.step(1000, 0, 1 / 60);
    near(p.result().angle, 0, 1e-10, 'warp');
});
test('tilt and disabled motion settings', () => {
    const p = new CursorPhysics({mode: 'tilt', stretch: 0});
    for (let i = 0; i < 120; i++) p.step(10, 0, 1 / 60);
    near(p.result().angle, -21, 0.1, 'tilt equilibrium');
    p.configure({sensitivity: 0, stretch: 0}); p.reset();
    for (let i = 0; i < 120; i++) p.step(20, 10, 1 / 60);
    near(p.result().angle, 0, 1e-10, 'zero sensitivity');
    near(p.result().scaleY, 1, 1e-10, 'zero stretch');
});
test('invalid samples leave state intact', () => {
    const p = new CursorPhysics();
    p.step(NaN, 0, 0.01); p.step(1, 1, 0); p.step(Infinity, 0, 0.01);
    near(p.result().angle, 0, 1e-10, 'invalid data');
});
print(`${passed} tests passed`);
