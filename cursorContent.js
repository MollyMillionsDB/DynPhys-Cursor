// SPDX-License-Identifier: GPL-2.0-or-later
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';

// Draw the Cogl texture directly: no per-frame CPU readback or custom artwork.
export const CursorContent = GObject.registerClass({
    GTypeName: 'DynPhysCursorContent',
    Implements: [Clutter.Content],
}, class CursorContent extends GObject.Object {
    _init(onFailure) {
        super._init();
        this._onFailure = onFailure;
        this._texture = null;
    }

    setTexture(texture) {
        this._texture = texture;
        this.invalidate();
    }

    vfunc_paint_content(actor, node, _context) {
        if (!this._texture)
            return;
        try {
            const [min, mag] = actor.get_content_scaling_filters();
            const paint = new Clutter.TextureNode(this._texture, null, min, mag);
            paint.add_rectangle(actor.get_content_box());
            node.add_child(paint);
        } catch (error) {
            this._texture = null;
            this._onFailure(error);
        }
    }
});
