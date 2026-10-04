import {CursorLease} from '../cursorLease.js';
function assert(ok, msg) { if (!ok) throw new Error(msg); }
let visible = 0, unfocus = 0, fail = false;
const tracker = {
    inhibit_cursor_visibility() { if (fail) throw new Error('injected failure'); visible++; },
    uninhibit_cursor_visibility() { visible--; },
};
const seat = {inhibit_unfocus() { unfocus++; }, uninhibit_unfocus() { unfocus--; }};
const lease = new CursorLease(tracker, seat);
lease.release();
assert(visible === 0 && unfocus === 0, 'release before acquire must be inert');
for (let i = 0; i < 100; i++) {
    lease.acquire(); lease.acquire();
    assert(visible === 1 && unfocus === 1, 'repeated acquire owns one inhibitor');
    lease.release(); lease.release();
    assert(visible === 0 && unfocus === 0, 'disable/pause restores both');
}
visible = 1; // Another component already owns an inhibitor.
lease.acquire(); lease.release();
assert(visible === 1, 'must preserve another component’s inhibitor');
visible = 0; fail = true;
try { lease.acquire(); } catch (_) { /* Expected */ }
assert(visible === 0 && unfocus === 0 && !lease.held, 'partial acquire must unwind');
print('PASS cursor lease: balanced cycles, other owners, partial failure');
