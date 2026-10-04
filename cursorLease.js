// SPDX-License-Identifier: GPL-2.0-or-later
/** Own exactly one visibility inhibitor and one seat unfocus inhibitor.
 * Never release another component's inhibitor, including on partial failure.
 */
export class CursorLease {
    constructor(tracker, seat) {
        this.tracker = tracker;
        this.seat = seat;
        this.held = false;
        this.unfocusHeld = false;
    }

    acquire() {
        if (this.held)
            return;
        try {
            this.seat.inhibit_unfocus();
            this.unfocusHeld = true;
            this.tracker.inhibit_cursor_visibility();
            this.held = true;
        } catch (error) {
            this.release();
            throw error;
        }
    }

    release() {
        try {
            if (this.held) {
                this.tracker.uninhibit_cursor_visibility();
                this.held = false;
            }
        } finally {
            if (this.unfocusHeld) {
                this.seat.uninhibit_unfocus();
                this.unfocusHeld = false;
            }
        }
    }
}
