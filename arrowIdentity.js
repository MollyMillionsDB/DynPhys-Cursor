// SPDX-License-Identifier: GPL-2.0-or-later
// Xcursor image chunks contain premultiplied ARGB pixels in little-endian order.
// Deliberately accept only bounded, well-formed raster images.
export function parseXcursor(bytes) {
    if (bytes.length < 16 || bytes.length > 8 * 1024 * 1024)
        return [];
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u32 = offset => view.getUint32(offset, true);
    const header = u32(4);
    const count = u32(12);
    if (u32(0) !== 0x72756358 || header < 16 || count > 256 ||
        header + count * 12 > bytes.length)
        return [];
    const frames = [];
    for (let i = 0; i < count; i++) {
        const toc = header + i * 12;
        if (u32(toc) !== 0xfffd0002)
            continue;
        const pos = u32(toc + 8);
        if (pos + 36 > bytes.length)
            return [];
        const chunkHeader = u32(pos);
        const width = u32(pos + 16), height = u32(pos + 20);
        const hotX = u32(pos + 24), hotY = u32(pos + 28);
        if (u32(pos + 4) !== 0xfffd0002 || chunkHeader < 36 ||
            width < 1 || height < 1 || width > 256 || height > 256 ||
            hotX >= width || hotY >= height ||
            pos + chunkHeader + width * height * 4 > bytes.length)
            return [];
        // Store RGBA premultiplied to compare with the readback independently
        // of native byte order and PNG's unpremultiplication round trip.
        const pixels = new Uint8Array(width * height * 4);
        for (let p = 0; p < pixels.length; p += 4) {
            const argb = u32(pos + chunkHeader + p);
            pixels[p] = (argb >>> 16) & 255;
            pixels[p + 1] = (argb >>> 8) & 255;
            pixels[p + 2] = argb & 255;
            pixels[p + 3] = argb >>> 24;
        }
        frames.push({width, height, hotX, hotY, pixels});
    }
    return frames;
}

export function matchesArrow(frames, sample) {
    const {width, height, hotX, hotY, pixels, rowstride, channels} = sample;
    if (channels !== 4 || rowstride < width * 4 ||
        pixels.length < (height - 1) * rowstride + width * 4)
        return false;
    return frames.some(frame => {
        if (frame.width !== width || frame.height !== height ||
            frame.hotX !== hotX || frame.hotY !== hotY)
            return false;
        let visible = false;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const a = (y * width + x) * 4;
            const b = y * rowstride + x * 4;
            const alpha = frame.pixels[a + 3];
            if (pixels[b + 3] !== alpha)
                return false;
            if (alpha === 0)
                continue;
            visible = true;
            for (let c = 0; c < 3; c++) {
                const premultiplied = Math.round(pixels[b + c] * alpha / 255);
                if (Math.abs(premultiplied - frame.pixels[a + c]) > 1)
                    return false;
            }
        }
        return visible;
    });
}

/** Async image readback can finish after the pointer has changed or disabled.
 * Only the exact candidate in the current generation may receive approval.
 */
export class ArrowApproval {
    constructor() { this.generation = 0; this.invalidate(); }
    invalidate() {
        this.generation++;
        this.approved = null;
        this.rejected = null;
    }
    async check(candidate, inspect) {
        if (this.pending)
            return;
        const generation = this.generation;
        this.pending = true;
        try {
            const accepted = await inspect();
            if (generation === this.generation) {
                this.approved = accepted ? candidate : null;
                this.rejected = accepted ? null : candidate;
            }
        } catch (_) {
            if (generation === this.generation)
                this.rejected = candidate;
        } finally {
            this.pending = false;
        }
    }
}
