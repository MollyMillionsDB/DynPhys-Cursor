// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {parseXcursor} from './arrowIdentity.js';

export function loadThemeArrows(theme) {
    const home = GLib.get_home_dir();
    const configured = GLib.getenv('XCURSOR_PATH');
    const roots = configured ? configured.split(':').filter(Boolean).map(path =>
        path.startsWith('~/') ? `${home}/${path.slice(2)}` : path) : [
        `${home}/.icons`, `${GLib.get_user_data_dir()}/icons`,
        ...GLib.get_system_data_dirs().map(path => `${path}/icons`), '/usr/share/pixmaps',
    ];
    const visited = new Set();
    function load(name) {
        if (!name || name.includes('/') || name === '..' || visited.has(name) || visited.size >= 16)
            return [];
        visited.add(name);
        const frames = [];
        for (const alias of ['default', 'left_ptr']) {
            for (const root of roots) {
                const file = Gio.File.new_for_path(`${root}/${name}/cursors/${alias}`);
                try {
                    const size = file.query_info('standard::size', Gio.FileQueryInfoFlags.NONE, null).get_size();
                    if (size > 8 * 1024 * 1024)
                        break;
                    const [ok, bytes] = file.load_contents(null);
                    if (ok) frames.push(...parseXcursor(bytes));
                    break;
                } catch (_) { /* Try next search path. */ }
            }
        }
        if (frames.length)
            return frames;
        for (const root of roots) {
            try {
                const keyfile = new GLib.KeyFile();
                keyfile.load_from_file(`${root}/${name}/index.theme`, GLib.KeyFileFlags.NONE);
                const parents = keyfile.get_string('Icon Theme', 'Inherits').split(/[,;]/);
                for (const parent of parents) {
                    const inherited = load(parent.trim());
                    if (inherited.length) return inherited;
                }
            } catch (_) { /* Missing inheritance is normal. */ }
        }
        return [];
    }
    // No speculative fallback to another theme: an unknown arrow stays native.
    return load(theme);
}
