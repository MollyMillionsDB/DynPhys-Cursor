#!/usr/bin/env python3
"""Package an explicit allowlist; exclude tests, private files and build debris."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
metadata = json.loads((root / 'metadata.json').read_text())
files = ['metadata.json', 'extension.js', 'prefs.js', 'physics.js',
         'arrowIdentity.js', 'cursorTheme.js', 'cursorReader.js', 'compatibility.js', 'cursorContent.js', 'cursorLease.js', 'settings.js', 'LICENSE',
         'schemas/org.gnome.shell.extensions.dynphys-cursor.gschema.xml',
         'schemas/gschemas.compiled']
output = root / 'dist' / f'{metadata["uuid"]}.shell-extension.zip'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(root / name, name)
print(f'Created {output.name}')
