// SPDX-License-Identifier: GPL-2.0-or-later
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {CONTROLS} from './settings.js';

export default class DynPhysPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.set_default_size(640, 780);
        const page = new Adw.PreferencesPage({title: 'Cursor physics', icon_name: 'input-mouse-symbolic'});
        window.add(page);
        const general = new Adw.PreferencesGroup({title: 'Behavior',
            description: 'Only recognized regular arrows receive physics. Other cursors stay native. Super+Alt+D pauses or resumes.'});
        page.add(general);
        for (const [key, title, subtitle] of [
            ['active', 'Enable physics', 'Pause to restore the normal cursor'],
            ['pause-fullscreen', 'Pause in fullscreen apps', 'Recommended for games and pointer capture'],
            ['pause-overview', 'Pause in Overview', 'Use the normal cursor in the overview'],
        ]) {
            const row = new Adw.SwitchRow({title, subtitle});
            settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            general.add(row);
        }
        const modes = ['rotate', 'tilt'];
        const mode = new Adw.ComboRow({title: 'Motion model',
            subtitle: 'Rotate: dragged body around its tip. Tilt: lean with horizontal speed.',
            model: Gtk.StringList.new(['Rotate', 'Tilt'])});
        mode.selected = modes.indexOf(settings.get_string('mode'));
        mode.connect('notify::selected', () => settings.set_string('mode', modes[mode.selected]));
        const modeChanged = settings.connect('changed::mode', () => {
            mode.selected = modes.indexOf(settings.get_string('mode'));
        });
        window.connect('close-request', () => {
            settings.disconnect(modeChanged);
            return false;
        });
        general.add(mode);
        const tuning = new Adw.PreferencesGroup({title: 'Tuning'});
        page.add(tuning);
        for (const [key, title, subtitle, lower, upper, step, digits] of CONTROLS) {
            const row = new Adw.SpinRow({title, subtitle, digits,
                adjustment: new Gtk.Adjustment({lower, upper, step_increment: step,
                    page_increment: step * 5})});
            settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
            tuning.add(row);
        }
        const reset = new Gtk.Button({label: 'Reset to defaults', halign: Gtk.Align.END,
            margin_top: 12, margin_bottom: 12});
        reset.connect('clicked', () => {
            for (const key of settings.settings_schema.list_keys())
                settings.reset(key);
        });
        tuning.add(reset);
    }
}
