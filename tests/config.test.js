import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {CONTROLS, migrateShortcutSetting, TOGGLE_SHORTCUT} from '../settings.js';
import {DEFAULTS} from '../physics.js';
const root = GLib.get_current_dir();
const source = Gio.SettingsSchemaSource.new_from_directory(`${root}/schemas`,
    Gio.SettingsSchemaSource.get_default(), false);
const schema = source.lookup('org.gnome.shell.extensions.dynphys-cursor', false);
if (!schema) throw new Error('Schema missing');
if (TOGGLE_SHORTCUT !== 'dynphys-cursor-toggle-shortcut')
    throw new Error('DynPhys keybinding name must stay namespaced');
for (const key of [TOGGLE_SHORTCUT, 'toggle-shortcut']) {
    if (schema.get_key(key).get_default_value().get_type_string() !== 'as')
        throw new Error(`Shortcut schema key has wrong type: ${key}`);
}
if (schema.get_key('shortcut-migration-complete').get_default_value().get_boolean() !== false)
    throw new Error('Shortcut migration marker must default to false');

function migrationSettings({legacy, current, complete = false}) {
    const values = {
        'toggle-shortcut': legacy,
        [TOGGLE_SHORTCUT]: current,
        'shortcut-migration-complete': complete,
    };
    return {
        get_boolean: key => values[key],
        get_strv: key => values[key],
        get_default_value: key => schema.get_key(key).get_default_value(),
        set_strv: (key, value) => { values[key] = value; },
        set_boolean: (key, value) => { values[key] = value; },
        values,
    };
}
const legacyCustom = ['<Super><Control>space'];
const migrated = migrationSettings({
    legacy: legacyCustom,
    current: schema.get_key(TOGGLE_SHORTCUT).get_default_value().deep_unpack(),
});
if (!migrateShortcutSetting(migrated) ||
    JSON.stringify(migrated.values[TOGGLE_SHORTCUT]) !== JSON.stringify(legacyCustom) ||
    !migrated.values['shortcut-migration-complete'])
    throw new Error('Legacy custom shortcut was not migrated');
migrated.values[TOGGLE_SHORTCUT] =
    schema.get_key(TOGGLE_SHORTCUT).get_default_value().deep_unpack();
if (migrateShortcutSetting(migrated) ||
    JSON.stringify(migrated.values[TOGGLE_SHORTCUT]) !==
        JSON.stringify(schema.get_key(TOGGLE_SHORTCUT).get_default_value().deep_unpack()))
    throw new Error('Legacy shortcut migration was repeated');

const userConfigured = migrationSettings({
    legacy: legacyCustom,
    current: ['<Super><Shift>space'],
});
if (migrateShortcutSetting(userConfigured) ||
    JSON.stringify(userConfigured.values[TOGGLE_SHORTCUT]) !== JSON.stringify(['<Super><Shift>space']))
    throw new Error('Migration overwrote the new shortcut setting');

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
