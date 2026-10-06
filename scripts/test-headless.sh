#!/bin/sh
# Optional integration test: GNOME 50, GTK4, Adwaita/Yaru and a working GPU.
# Creates an independent compositor and settings; never installs into the real session.
set -eu
cd "$(dirname "$0")/.."
sh scripts/package.sh
probe_root=$(mktemp -d /tmp/dynphys-test.XXXXXX)
trap 'rm -rf "$probe_root"' EXIT HUP INT TERM
export XDG_DATA_HOME="$probe_root/data"
export XDG_CONFIG_HOME="$probe_root/config"
export XDG_CACHE_HOME="$probe_root/cache"
export XDG_RUNTIME_DIR="$probe_root/run"
export GSETTINGS_BACKEND=keyfile
export WAYLAND_DISPLAY=wayland-dynphys-test
export LIBGL_ALWAYS_SOFTWARE=1
mkdir -p "$XDG_RUNTIME_DIR" "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME"
chmod 700 "$XDG_RUNTIME_DIR"
python3 - <<'PY'
import os
from pathlib import Path
from zipfile import ZipFile
uuid='dynphys-cursor@mollymillionsdb.github.io'
stage=Path(os.environ['XDG_DATA_HOME'])/'gnome-shell/extensions'/uuid
stage.mkdir(parents=True)
with ZipFile(Path('dist')/f'{uuid}.shell-extension.zip') as archive:
    archive.extractall(stage)
(stage/'integrationProbe.js').write_text(Path('tests/headlessProbe.js').read_text())
(stage/'clientProbe.js').write_text(Path('tests/clientProbe.js').read_text())
extension=stage/'extension.js'
code=extension.read_text()
assert '            this._timeline.start();' in code
code="import {probe} from './integrationProbe.js';\n"+code
code=code.replace('            this._timeline.start();','            this._timeline.start();\n            probe(this);',1)
extension.write_text(code)
PY
# timeout is expected: it shuts down the otherwise persistent test compositor.
timeout --kill-after=5s 28s dbus-run-session -- sh -c '
  gsettings set org.gnome.shell enabled-extensions "[\"dynphys-cursor@mollymillionsdb.github.io\"]"
  gsettings set org.gnome.shell disable-user-extensions false
  gsettings set org.gnome.desktop.interface cursor-theme Yaru
  exec gnome-shell --headless --wayland --no-x11 --virtual-monitor=1280x720 --wayland-display=wayland-dynphys-test
' > dist/headless-test.log 2>&1 || test "$?" -eq 124
python3 - <<'PY'
from pathlib import Path
log=Path('dist/headless-test.log').read_text()
for line in log.splitlines():
    if 'DYNPHYS-PROBE' in line:
        print(line)
assert 'DYNPHYS-PROBE ALL PASS' in log and 'DYNPHYS-PROBE FAILED' not in log, 'See dist/headless-test.log'
PY
