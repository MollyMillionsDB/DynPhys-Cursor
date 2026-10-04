# DynPhys Cursor

An experimental GNOME Wayland extension that keeps the cursor tip at the pointer position while its body rotates, leans and stretches with movement. A damped spring returns it to rest when you stop. It uses the current cursor texture and hotspot, including theme and application cursor changes; it does not change pointer acceleration or click coordinates.

**Status: first prototype, awaiting desktop testing.** The initial target is GNOME Shell **50**. Metadata permits 49, 50 and 51; 49 and 51 are provisional API-compatible targets, not verified desktop support. GNOME 51 APIs were checked against upstream development sources on 2026-10-04. X11 and GNOME 48 or older are not supported by this version.

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
| Maximum rotation | 100° | Limits swing in either direction |
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

## Limitations

- This is a Shell-rendered replacement, not a Mutter compositor patch. The displayed hotspot follows sampled pointer coordinates each animation frame, so hardware-cursor latency and direct-scanout performance are not preserved. Continuous frame callbacks also carry an idle power cost.
- Physical desktop rendering is **not yet verified**. The first milestone is proving replacement, hotspot alignment and reliable cleanup on a real GNOME 50 Wayland session.
- Rotation applies to every available cursor shape, including text, resize, hand and busy cursors. There is no robust semantic cursor-name filter through this API. Animated themes, client-provided cursors and mixed/fractional monitor scaling need testing.
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
