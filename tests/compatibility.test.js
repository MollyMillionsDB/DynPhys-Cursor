import {assertWaylandSession} from '../compatibility.js';
// Reproduce GNOME 50's namespace: the removed function is absent.
assertWaylandSession({});
assertWaylandSession({is_wayland_compositor: () => true});
let rejected = false;
try {
    assertWaylandSession({is_wayland_compositor: () => false});
} catch (error) {
    rejected = error.message.includes('requires a GNOME Wayland session');
}
if (!rejected) throw new Error('A legacy X11 session must still be rejected');
print('PASS session compatibility: removed API, legacy Wayland, legacy X11');
