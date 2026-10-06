// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';

// Only the small cursor texture is read, never desktop/window contents.
// The finish API returns a pixbuf; the temporary PNG stream remains in memory.
export function readCursorPixels(texture, hotX, hotY) {
    return new Promise((resolve, reject) => {
        const stream = Gio.MemoryOutputStream.new_resizable();
        try {
            Shell.Screenshot.composite_to_stream(texture, 0, 0, -1, -1, 1,
                null, 0, 0, 1, stream, (_source, result) => {
                    try {
                        const pixbuf = Shell.Screenshot.composite_to_stream_finish(result);
                        if (!pixbuf || !pixbuf.get_has_alpha() || pixbuf.get_bits_per_sample() !== 8)
                            throw new Error('Unsupported cursor readback');
                        resolve({width: pixbuf.get_width(), height: pixbuf.get_height(),
                            hotX, hotY, rowstride: pixbuf.get_rowstride(),
                            channels: pixbuf.get_n_channels(), pixels: pixbuf.get_pixels()});
                    } catch (error) {
                        reject(error);
                    } finally {
                        stream.close(null);
                    }
                });
        } catch (error) {
            stream.close(null);
            reject(error);
        }
    });
}
