// SPDX-License-Identifier: GPL-2.0-or-later
/** Reject legacy X11 sessions where the backend query exists.
 * GNOME 50 removed the X11 backend and this query; supported newer Shell
 * versions are Wayland-only, so absence of the old function is expected.
 */
export function assertWaylandSession(meta) {
    if (typeof meta.is_wayland_compositor === 'function' && !meta.is_wayland_compositor())
        throw new Error('This prototype requires a GNOME Wayland session.');
}
