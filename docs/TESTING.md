# Test plan and current evidence

## Automated checks

Run `sh scripts/package.sh` from the repository. It checks:

- Rest equilibrium, drag sign/reversal and settling after stopping.
- Similar rotation at 30, 60 and 144 Hz.
- Finite bounded behavior at the allowed spring/damping extremes.
- Reset after timing gaps and pointer warps; rejection of invalid samples.
- Tilt equilibrium and zero sensitivity/stretch.
- Balanced inhibitor ownership over 100 pause/resume cycles, preservation of another owner, and unwind after partial acquisition failure.
- Schema compilation, UI/schema range agreement, physics/schema default agreement and JavaScript module syntax.
- Rightward angle bounds through high speed, stop and reversal; unchanged leftward equilibrium.
- Arrow pixel/hotspot matching, rejection of other glyphs sharing dimensions, malformed/truncated Xcursor input and stale asynchronous results.
- ZIP creation using the explicit extension-file allowlist.

Initial checks passed on 2026-10-04 with GJS 1.88.0. Real GNOME 50.1 GI method availability was inspected. An isolated headless Shell test was attempted, but this execution environment rejected the private D-Bus socket (`Operation not permitted`) before Shell started. **That initial run did not establish desktop rendering, preferences interaction, latency, screen capture or visual QA. Later evidence is recorded below.** CI status should be checked separately on GitHub.

## Version 2 startup regression

On 2026-10-04, a GNOME 50 desktop reported `TypeError: (intermediate value).is_wayland_compositor is not a function` during enable. Version 1 called a removed API before creating the cursor actor. The initial API inspection missed this startup query.

Version 2 checks whether the legacy query exists before calling it. GNOME 50 removed the X11 backend, so newer supported versions do not need that query. A regression test covers its absence, legacy Wayland acceptance and legacy X11 rejection. The corrected helper also passed with the actual installed GNOME 50 Meta namespace. Successful desktop rendering still requires user retesting.

## Version 3 evidence (2026-10-06)

The user confirmed version 2 works on GNOME 50, but reported excessive rightward rotation, a stale arrow in a chat input and unwanted physics on text cursors. Version 3 addresses these with asymmetric limits and native rendering for every image not positively identified as the regular arrow.

The GJS suite and package checks pass. Real Adwaita raster tests accepted 12 arrow frames and rejected text, hand, crosshair, busy and resize images. Actual GPU-to-pixbuf readback matched both Adwaita and Yaru references in an isolated GNOME Shell 50.1 session. The same session verified arrow replacement, native text/hand/resize cursors, return to the arrow, and native cursor restoration on disable. A separate GTK4 Wayland client also passed arrow → text → hand → resize → arrow changes using application-supplied cursor images while the pointer stayed stationary. These are programmatic integration assertions, not visual inspection.

The optional integration harness is reproducible with `sh scripts/test-headless.sh` on a machine with GNOME 50, GTK4, Adwaita/Yaru cursor themes and a working graphics stack. It creates a separate temporary compositor, settings and test window; it does not install into the active desktop. It needs permission to create a private D-Bus/Wayland socket. Results are in `dist/headless-test.log`. The ordinary CI job runs only the portable GJS tests.

The isolated session emitted an unrelated GNOME date-menu/notification error during forced shutdown, after the assertions completed; no claim of a warning-free Shell shutdown is made.

The originally reported chat input, physical display scaling, perceived motion/latency and GNOME 51 still require desktop retesting. Earlier isolated test attempts were blocked by sandbox socket restrictions; the completed checks used a separately configured temporary session, not the user's active desktop.

## First desktop acceptance pass

Record `gnome-shell --version`, session type (`echo "$XDG_SESSION_TYPE"`), commit (`git rev-parse --short HEAD`), cursor theme/size and each monitor's scale/refresh rate. Start with only this cursor-related extension enabled and defaults restored.

1. **Baseline/recovery:** enable, pause with Super+Alt+D, resume, disable, re-enable. At each transition there should be exactly one cursor; disable should restore the ordinary cursor immediately. Repeat ten times. Stop testing if the native cursor is not recoverable.
2. **Hotspot:** with stretch set to zero, move slowly over a tiny button or pixel grid, then sweep horizontally/vertically and reverse sharply. The visual tip should stay at the click location while the body swings. Check all monitor edges. Compare with the extension paused.
3. **Feel:** sweep fast, circle and stop. The cursor should settle promptly without sustained jitter. Compare Rotate and Tilt. Change spring, damping, sensitivity, length and smoothing one at a time; note useful values rather than only saying “too wobbly.”
4. **Preferences:** open the window, change each control, reset defaults, close/reopen and confirm persistence. Zero stretch should remove deformation; zero maximum rotation should remove rotation. Pause/resume should not cause a jump.
5. **Cursor shapes:** test arrow, text caret, link hand, edge/corner resize, drag-and-drop, busy animation and application-hidden cursor. There should be no stale texture or permanent disappearance. All non-arrow shapes must stay native and completely untransformed. Check the originally affected chat input explicitly; confirm the I-beam appears every time, including rapid arrow/text transitions. Unmatched application arrows may also remain native by design.
6. **Scaling:** test 100%, 200%, fractional scaling, theme size changes and cross-monitor travel. Verify tip alignment and size on both sides of boundaries. Report native versus replacement screenshots if they show the discrepancy accurately.
7. **Shell lifecycle:** Overview, app switcher, lock/unlock, suspend/resume, monitor disconnect/reconnect, logout/login. Cursor replacement must suspend on lock and magnification, and return without duplicated actors. Test touch-to-mouse transition if hardware is available.
8. **Apps:** verify fullscreen pause; manually pause for pointer-locked games, remote desktop and tablet workflows. Do not infer support from a normal browser test.
9. **Captures/performance:** compare a screenshot and a short screen recording with/without replacement; note missing/doubled cursor. Compare idle and motion CPU usage, battery behavior and perceived latency at your normal refresh rate.
10. **Logs:** after enabling/disabling and exercising preferences, inspect recent Shell logs for `DynPhys`, JavaScript exceptions and actor/Clutter warnings.

```sh
journalctl --user -b -o cat --since '10 minutes ago' | rg -i 'dynphys|JS ERROR|clutter'
```

On systems where Shell logs are not in the user journal, try `journalctl -b _COMM=gnome-shell --since '10 minutes ago'`. Share only relevant lines.

## Feedback template

```text
Commit:
GNOME / distribution / Wayland:
Cursor theme and size:
Monitors (scale and Hz):
Other cursor or accessibility extensions:
Mode and changed settings:
Steps:
Expected / observed:
Does pausing or disabling restore the native cursor?:
Relevant log lines:
```

The first success criterion is trustworthy cursor replacement and restoration. Physics polish follows real visual feedback. GNOME 49 and 51 require their own acceptance passes.
