import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {CONTROLS} from '../settings.js';
import {DEFAULTS} from '../physics.js';
const root = GLib.get_current_dir();
const source = Gio.SettingsSchemaSource.new_from_directory(`${root}/schemas`,
    Gio.SettingsSchemaSource.get_default(), false);
const schema = source.lookup('org.gnome.shell.extensions.dynphys-cursor', false);
if (!schema) throw new Error('Schema missing');
for (const [key, , , lower, upper] of CONTROLS) {
    const definition = schema.get_key(key);
    const name = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (definition.get_default_value().get_double() !== DEFAULTS[name])
        throw new Error(`Default mismatch: ${key}`);
    for (const value of [lower, upper]) {
        if (!definition.range_check(new GLib.Variant('d', value)))
            throw new Error(`UI range exceeds schema: ${key}`);
    }
    for (const value of [lower - 0.001, upper + 0.001]) {
        if (definition.range_check(new GLib.Variant('d', value)))
            throw new Error(`Schema range exceeds UI: ${key}`);
    }
}
for (const path of ['arrowIdentity.js', 'cursorTheme.js', 'cursorReader.js', 'compatibility.js', 'extension.js', 'prefs.js', 'cursorContent.js', 'cursorLease.js', 'physics.js', 'settings.js']) {
    const [, bytes] = GLib.file_get_contents(`${root}/${path}`);
    Reflect.parse(new TextDecoder().decode(bytes), {target: 'module'});
}
print('PASS settings defaults/ranges and all extension module syntax');
