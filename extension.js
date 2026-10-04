// SPDX-License-Identifier: GPL-2.0-or-later
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {CursorContent} from './cursorContent.js';
import {CursorPhysics} from './physics.js';
import {CursorLease} from './cursorLease.js';

export default class DynPhysCursor extends Extension {
    enable() {
        this._connections = [];
        this._failed = false;
        try {
            if (!Meta.is_wayland_compositor())
                throw new Error('This prototype requires a GNOME Wayland session.');
            this._settings = this.getSettings();
            this._a11y = new Gio.Settings({schema_id: 'org.gnome.desktop.a11y.applications'});
            this._tracker = global.backend.get_cursor_tracker();
            if (typeof this._tracker.inhibit_cursor_visibility !== 'function')
                throw new Error('Cursor visibility inhibition requires GNOME 49 or newer.');
            const seat = global.stage.get_context().get_backend().get_default_seat();
            this._lease = new CursorLease(this._tracker, seat);
            this._touch = false;
            this._connect(global.stage, 'captured-event', (_stage, event) => {
                const type = event.type();
                if (type === Clutter.EventType.TOUCH_BEGIN)
                    this._touch = true;
                else if (type === Clutter.EventType.MOTION || type === Clutter.EventType.BUTTON_PRESS)
                    this._touch = false;
                return Clutter.EVENT_PROPAGATE;
            });
            this._physics = new CursorPhysics();
            this._content = new CursorContent(error => this._fail(error));
            this._actor = new Clutter.Actor({reactive: false, visible: false,
                content: this._content, name: 'DynPhys-Cursor'});
            // A stage child stays above Shell UI without intercepting input.
            global.stage.add_child(this._actor);
            this._connect(this._settings, 'changed', () => this._configure());
            this._connect(this._tracker, 'cursor-changed', () => { this._dirty = true; });
            this._configure();
            Main.wm.addKeybinding('toggle-shortcut', this._settings,
                Meta.KeyBindingFlags.NONE, Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                () => this._settings.set_boolean('active', !this._settings.get_boolean('active')));
            this._keybinding = true;
            this._timeline = new Clutter.Timeline({actor: global.stage, duration: 1000,
                repeat_count: -1});
            this._frameId = this._timeline.connect('new-frame', () => {
                try { this._frame(); } catch (error) { this._fail(error); }
            });
            this._timeline.start();
        } catch (error) {
            this.disable();
            throw error;
        }
    }

    _connect(object, signal, callback) {
        this._connections.push([object, object.connect(signal, callback)]);
    }

    _configure() {
        const s = this._settings;
        this._physics.configure({mode: s.get_string('mode'),
            spring: s.get_double('spring'), damping: s.get_double('damping'),
            length: s.get_double('length'), sensitivity: s.get_double('sensitivity'),
            smoothing: s.get_double('smoothing'), maxAngle: s.get_double('max-angle'),
            tilt: s.get_double('tilt'), stretch: s.get_double('stretch'),
            restAngle: s.get_double('rest-angle')});
        this._physics.reset();
        this._dirty = true;
        this._lastTime = 0;
    }

    _shouldPause() {
        return this._touch || !this._settings.get_boolean('active') || Main.sessionMode.isLocked ||
            (Main.sessionMode.currentMode !== 'user' && Main.sessionMode.parentMode !== 'user') ||
            this._a11y.get_boolean('screen-magnifier-enabled') ||
            (this._settings.get_boolean('pause-overview') && Main.overview.visible) ||
            (this._settings.get_boolean('pause-fullscreen') &&
                global.display.focus_window?.is_fullscreen());
    }

    _release() {
        this._actor?.hide();
        this._lease?.release();
        this._lastTime = 0;
        this._physics?.reset();
    }

    _frame() {
        if (this._failed || this._shouldPause()) {
            this._release();
            return;
        }
        const texture = this._tracker.get_sprite();
        if (!texture || (!this._lease.held && !this._tracker.get_pointer_visible())) {
            this._release();
            return;
        }
        const [x, y] = global.get_pointer();
        const [hx, hy] = this._tracker.get_hot();
        const scale = this._tracker.get_scale();
        if (!Number.isFinite(scale) || scale <= 0)
            throw new Error('Invalid cursor texture scale');
        const width = texture.get_width();
        const height = texture.get_height();
        if (!width || !height) {
            this._release();
            return;
        }
        if (this._dirty || texture !== this._texture || scale !== this._scale ||
            hx !== this._hotX || hy !== this._hotY) {
            this._content.setTexture(texture);
            this._actor.set_size(width * scale, height * scale);
            this._actor.set_pivot_point(hx / width, hy / height);
            this._texture = texture;
            this._scale = scale;
            this._hotX = hx;
            this._hotY = hy;
            this._dirty = false;
        }
        const now = GLib.get_monotonic_time() / 1000000;
        const state = this._lastTime
            ? this._physics.step(x - this._lastX, y - this._lastY, now - this._lastTime)
            : this._physics.result();
        this._lastTime = now;
        this._lastX = x;
        this._lastY = y;
        this._actor.set_position(x - hx * scale, y - hy * scale);
        this._actor.rotation_angle_z = state.angle;
        this._actor.set_scale(state.scaleX, state.scaleY);
        global.stage.set_child_above_sibling(this._actor, null);
        this._actor.show();
        this._lease.acquire();
    }

    _fail(error) {
        if (this._failed)
            return;
        this._failed = true;
        console.error(`[DynPhys-Cursor] ${error.stack ?? error}`);
        this._timeline?.stop();
        this._release();
        // Defer notifications outside a possible paint callback.
        this._errorIdle = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._errorIdle = 0;
            Main.notifyError('DynPhys Cursor paused',
                'The normal cursor has been restored. Disable and re-enable the extension to retry.');
            return GLib.SOURCE_REMOVE;
        });
    }

    disable() {
        this._timeline?.stop();
        if (this._timeline && this._frameId)
            this._timeline.disconnect(this._frameId);
        this._frameId = 0;
        this._timeline = null;
        if (this._errorIdle) {
            GLib.Source.remove(this._errorIdle);
            this._errorIdle = 0;
        }
        if (this._keybinding) {
            Main.wm.removeKeybinding('toggle-shortcut');
            this._keybinding = false;
        }
        for (const [object, id] of this._connections ?? [])
            object.disconnect(id);
        this._connections = [];
        this._release();
        this._actor?.destroy();
        this._actor = null;
        this._content = null;
        this._texture = null;
        this._lease = null;
        this._tracker = null;
        this._settings = null;
        this._a11y = null;
        this._physics = null;
    }
}
