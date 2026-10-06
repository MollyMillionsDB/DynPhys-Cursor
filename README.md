# DynPhys Cursor

An experimental GNOME Wayland extension that keeps the cursor tip at the pointer position while its body rotates, leans and stretches with movement. A damped spring returns it to rest when you stop. It animates only cursor images that match the active theme’s regular arrow. Text, hand, resize and unrecognized cursors remain native; it does not change pointer acceleration or click coordinates.

**Status: version 3 prototype.** Basic operation was confirmed on a GNOME 50 desktop; arrow-only filtering and asymmetric motion are new in version 3 and need desktop feedback. The initial target is GNOME Shell **50**. Metadata permits 49, 50 and 51; 49 and 51 are provisional API-compatible targets, not verified desktop support. GNOME 51 APIs were checked against upstream development sources on 2026-10-04. X11 and GNOME 48 or older are not supported by this version.

## Install

You need `git`, `gjs`, `glib-compile-schemas`, Python 3 and the `gnome-extensions` command. On Debian/Ubuntu, the build dependencies can be installed with:

```sh
sudo apt install git gjs libglib2.0-bin python3
```

Run these as your regular desktop user:

```sh
git clone https://github.com/MollyMillionsDB/DynPhys-Cursor.git
cd DynPhys-Cursor
sh scripts/package.sh
gnome-extensions install --force dist/dynphys-cursor@mollymillionsdb.github.io.shell-extension.zip
```

**Log out and log back in** so GNOME discovers the extension. Then:

```sh
gnome-extensions enable dynphys-cursor@mollymillionsdb.github.io
gnome-extensions prefs dynphys-cursor@mollymillionsdb.github.io
```

Wayland cannot reload GNOME Shell with Alt+F2 → `r`. If preferences do not open, install your distribution's GNOME Extensions preferences application.

## Controls

**Super+Alt+D** pauses/resumes the effect. The preferences window exposes these controls and a reset button; changes apply immediately.

| Control | Default | Effect |
| --- | --- | --- |
| Motion model | Rotate | Dragged-rod rotation, or horizontal-speed Tilt |
| Motion sensitivity | 1 | Overall movement response |
| Return spring | 180 | Strength of the return to rest |
| Damping | 22 | Resistance to angular motion; higher values reduce wobble |
| Drag length | 70 px | Longer body responds less to dragging in Rotate mode |
| Velocity smoothing | 35 ms | Smooths velocity without delaying the hotspot position |
| Maximum rotation | 100° | Overall swing limit; the rightward side has an additional cap |
| Rightward rotation limit | 35° | Caps the rightward-driven side, including spring overshoot (maximum 45°) |
| Rightward response | 0.45 | Gentler rightward response; leftward response is unchanged |
| Cursor body direction | 45° | Direction from tip toward body in the unrotated artwork |
| Tilt strength | 0.035 | Degrees per pixel/second, in Tilt mode |
| Stretch strength | 0.12 | Speed-dependent stretch along the cursor's local vertical axis |
| Pause in fullscreen apps | On | Restores the normal cursor for the focused fullscreen window |
| Pause in Overview | On | Restores the normal cursor in Overview |

Start with defaults. For more wobble, reduce damping gradually. For quicker settling, increase the spring or damping; very high damping can slow the return. Set stretch to zero for rotation alone. Cursor body direction describes the artwork's tail direction, not a permanent visual rotation offset.

GNOME magnification, lock/login modes and touch input temporarily suspend replacement. Mouse motion resumes it after touch. The shortcut is also configurable through GSettings; the preferences window shows the default shortcut, not a shortcut editor:

```sh
gsettings --schemadir "$HOME/.local/share/gnome-shell/extensions/dynphys-cursor@mollymillionsdb.github.io/schemas" \
  set org.gnome.shell.extensions.dynphys-cursor toggle-shortcut "['<Super><Alt>d']"
```

## Update, recover, remove

For updates:

```sh
cd DynPhys-Cursor
git pull --ff-only
gnome-extensions disable dynphys-cursor@mollymillionsdb.github.io
sh scripts/package.sh
gnome-extensions install --force dist/dynphys-cursor@mollymillionsdb.github.io.shell-extension.zip
```

Log out/in after replacing the files, then enable again. Disabling/re-enabling alone does not reliably reload cached JavaScript modules.

If the cursor looks wrong, press **Super+Alt+D**, or open a terminal with the keyboard and run:

```sh
gnome-extensions disable dynphys-cursor@mollymillionsdb.github.io
```

Disable releases this extension's cursor inhibition and removes its actor. A detected rendering/update exception also releases the cursor, stops animation and logs an error. A compositor crash or hang cannot be recovered by extension JavaScript; logging out/in starts a clean session.

To uninstall:

```sh
gnome-extensions disable dynphys-cursor@mollymillionsdb.github.io
gnome-extensions uninstall dynphys-cursor@mollymillionsdb.github.io
```

## Which cursors receive physics?

Only a pixel-and-hotspot match against the active theme's `default` or `left_ptr` raster cursor is animated. Every cursor-change notification immediately removes the overlay and restores the native cursor. The new image is checked while native rendering remains active; text, hand, resize, busy, hidden, custom and otherwise unmatched cursors receive no rotation or stretch.

This is deliberately conservative: an application arrow with different artwork or scaling may remain native too. There is no guess based only on cursor size or hotspot. Theme inheritance is supported; unreadable or unsupported themes (including SVG-only references) leave the native cursor untouched. Small cursor-texture readbacks occur on shape changes, not every animation frame; no desktop/window pixels are read and no image is written to disk.

## Limitations

- This is a Shell-rendered replacement, not a Mutter compositor patch. The displayed hotspot follows sampled pointer coordinates each animation frame, so hardware-cursor latency and direct-scanout performance are not preserved. Continuous frame callbacks also carry an idle power cost.
- Basic version 2 operation has user confirmation. Version 3 passed isolated GNOME 50 cursor integration tests, but the originally reported chat-box issue, physical monitor scaling and latency still require desktop retesting.
- GNOME’s tracker provides no dependable semantic cursor-name API. Pixel matching can decline valid arrows in unusual themes or client rendering paths; those cursors remain native. Animated themes and mixed/fractional scaling need further testing.
- Stretch is a local-axis approximation, not direction-aligned mesh deformation. Rotate is a spring/drag model inspired by the behavior of a dragged rod, not a port of Hyprland's physics.
- Avoid running another cursor-replacement extension at the same time. Visibility inhibitors are reference-counted, but their owners are not exposed: after we hide the native cursor, we cannot reliably detect an additional owner's visibility change. Magnification is explicitly excluded.
- Fullscreen pause covers the focused fullscreen window. Windowed games, relative-pointer locks, remote desktops, tablet input and screen recording are not certified; pause manually. Captures may include the overlay, a separate native cursor, both or neither depending on the capture path.
- This has no privileged daemon, input injection, telemetry, network traffic or root installation. It still executes inside GNOME Shell, so test the prototype with recoverable work.

## Testing and feedback

See [the desktop test plan](docs/TESTING.md) and [architecture/API notes](docs/ARCHITECTURE.md).

`sh scripts/package.sh` compiles the schema, runs GJS physics/configuration/lifecycle-unit tests, checks module syntax and creates a ZIP from an explicit file allowlist. CI runs the same checks and uploads the ZIP. These checks cannot establish visual correctness or compositor stability.

The intended loop is **implement → push → pull/install → desktop test → report feedback → revise**. Include the commit (`git rev-parse --short HEAD`), GNOME version, monitor scaling, cursor theme, settings, reproduction steps and relevant Shell log lines. Avoid including unrelated private log content.

## License and references

GPL-2.0-or-later; see [LICENSE](LICENSE). Cursor texture rendering follows the public Clutter content API pattern used by [GNOME Shell's magnifier](https://github.com/GNOME/gnome-shell/blob/gnome-50/js/ui/magnifier.js). The physics implementation is original. Behavioral inspiration: [hypr-dynamic-cursors](https://github.com/VirtCode/hypr-dynamic-cursors).
