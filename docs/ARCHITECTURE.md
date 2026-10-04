# Architecture and API notes

## Data path

Each Clutter timeline frame samples `global.get_pointer()`. The pure physics module estimates smoothed velocity, applies drag torque or a tilt target, and integrates a damped return spring in substeps of at most 1/240 second. A gap over 100 ms or jump over 500 logical pixels resets state instead of injecting a large impulse. Rotation and stretch are bounded.

A non-reactive stage actor displays the current Cogl texture via a `Clutter.Content` implementation. `CursorTracker.get_hot()` supplies the hotspot in texture coordinates; `get_scale()` supplies the texture-to-stage scale. The actor is placed at pointer minus scaled hotspot and pivots at hotspot divided by texture dimensions. Thus both rotation and local-axis stretch leave the hotspot anchored mathematically. Mixed-scale desktop behavior remains an integration test, not an established result.

The actor is raised above Shell content each active frame. It never takes input focus or modifies pointer events. Texture references are used directly, without CPU pixel copies. `cursor-changed` invalidates the content, while each frame checks the current sprite/scale/hotspot. Missing sprites release replacement.

## Lifecycle

Enable constructs settings, content, actor, signal connections, shortcut and animation timeline. Visibility is acquired only after a valid sprite is positioned. `CursorLease` owns one seat-unfocus inhibitor and one cursor-visibility inhibitor, mirroring the ownership pattern in GNOME's magnifier; acquisition failures unwind the acquired portion. Releasing twice is harmless. Other components' inhibitor counts are preserved.

Pausing hides the overlay and releases both inhibitors. Disable stops and disconnects the timeline, removes the shortcut and signal handlers, cancels pending error notifications, releases inhibitors and destroys the actor. An exception during a frame or paint callback stops the effect and restores native cursor visibility subject to other inhibitor owners. Failure does not automatically retry every frame; disable/re-enable explicitly to retry.

The extension runs only in a user session or a mode inheriting user, allowing Ubuntu's session mode. It pauses for magnification, locks, touch, and optionally Overview/fullscreen. These gates are checked each frame. GNOME also disables ordinary extensions across lock-screen mode changes.

## API compatibility

Primary development target: GNOME 50. The installed development environment has GNOME Shell 50.1/GJS 1.88.0. GI inspection confirmed the visibility, seat, content and timeline API entry points. This does not substitute for running a compositor session.

GNOME 49 and upstream 51 have the required inhibition API. GNOME 48 uses `set_pointer_visible()` instead, and is intentionally excluded to avoid conflating visibility ownership models. Metadata enables 49/50/51 for testing; 49 and 51 remain provisional. GNOME releases can change private Shell APIs even when introspected Mutter methods remain stable.

Sources checked on 2026-10-04:

- [GNOME 50 magnifier](https://github.com/GNOME/gnome-shell/blob/gnome-50/js/ui/magnifier.js): direct texture paint nodes and balanced seat/visibility ownership.
- [GNOME 50 cursor tracker](https://github.com/GNOME/mutter/blob/gnome-50/src/backends/meta-cursor-tracker.c): texture scale, hotspot and inhibitor semantics.
- [GNOME 49 magnifier](https://github.com/GNOME/gnome-shell/blob/gnome-49/js/ui/magnifier.js): inhibition compatibility.
- [Mutter 51 CursorTracker API](https://mutter.gnome.org/meta/class.CursorTracker.html) and [development source](https://github.com/GNOME/mutter/blob/main/src/backends/meta-cursor-tracker.c).
- [Hyprland behavior reference](https://github.com/VirtCode/hypr-dynamic-cursors): conceptual inspiration; no dependency or copied physics implementation.

## Next milestones

1. Confirm a single correctly positioned cursor, reliable disable, shape changes and scaling on GNOME 50 Wayland.
2. Tune spring/drag response based on desktop feedback; improve cursor-role handling if a reliable API becomes available.
3. Measure frame latency and CPU/power impact; replace continuous animation with an event-driven wake/settle scheduler if feasible.
4. Verify GNOME 51 in a real session before describing it as supported.
