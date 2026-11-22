// SPDX-License-Identifier: GPL-2.0-or-later
export const TOGGLE_SHORTCUT = 'dynphys-cursor-toggle-shortcut';

export function migrateShortcutSetting(settings) {
    if (settings.get_boolean('shortcut-migration-complete'))
        return false;

    const legacy = settings.get_strv('toggle-shortcut');
    const current = settings.get_strv(TOGGLE_SHORTCUT);
    const legacyDefault = settings.get_default_value('toggle-shortcut').deep_unpack();
    const currentDefault = settings.get_default_value(TOGGLE_SHORTCUT).deep_unpack();
    const equal = (left, right) => left.length === right.length &&
        left.every((value, index) => value === right[index]);

    const shouldMigrate = !equal(legacy, legacyDefault) &&
        equal(current, currentDefault);
    if (shouldMigrate)
        settings.set_strv(TOGGLE_SHORTCUT, legacy);

    settings.set_boolean('shortcut-migration-complete', true);
    return shouldMigrate;
}

// Shared UI metadata; ranges are also enforced by the GSettings schema.
export const CONTROLS = [
    ['sensitivity', 'Motion sensitivity', 'Overall response to pointer motion', 0, 4, 0.1, 2],
    ['spring', 'Return spring', 'Higher values return to the resting angle faster', 10, 800, 10, 0],
    ['damping', 'Damping', 'Higher values reduce oscillation', 2, 80, 1, 0],
    ['length', 'Drag length', 'Logical pixels; longer rods rotate less (Rotate mode)', 10, 300, 5, 0],
    ['smoothing', 'Velocity smoothing', 'Milliseconds; lower values respond more sharply', 0, 200, 5, 0],
    ['max-angle', 'Maximum rotation', 'Degrees in either direction from rest', 0, 180, 5, 0],
    ['rightward-limit', 'Rightward rotation limit', 'Keeps the arrow upright during rightward motion; degrees', 0, 45, 5, 0],
    ['rightward-response', 'Rightward response', 'Fraction of normal response when moving right; leftward motion is unchanged', 0, 1, 0.05, 2],
    ['rest-angle', 'Cursor body direction', 'Degrees clockwise from right; default arrow body points down-right', -180, 180, 5, 0],
    ['tilt', 'Tilt strength', 'Degrees per pixel/second (Tilt mode)', 0, 0.15, 0.005, 3],
    ['stretch', 'Stretch strength', 'Stretches the cursor’s local vertical axis with speed; zero disables', 0, 0.5, 0.01, 2],
];
