import {parseXcursor, matchesArrow, ArrowApproval} from '../arrowIdentity.js';
function assert(ok, message) { if (!ok) throw new Error(message); }
// Small synthetic image chunk with one opaque, one semitransparent and two
// transparent pixels. It tests the format, not a hardcoded visual heuristic.
const bytes = new Uint8Array(80);
const view = new DataView(bytes.buffer);
const set = (offset, value) => view.setUint32(offset, value, true);
set(0, 0x72756358); set(4, 16); set(8, 0x10000); set(12, 1);
set(16, 0xfffd0002); set(20, 24); set(24, 28);
set(28, 36); set(32, 0xfffd0002); set(36, 24); set(40, 1);
set(44, 2); set(48, 2); set(52, 0); set(56, 0); set(60, 0);
set(64, 0xff804020); set(68, 0x80402010);
const frames = parseXcursor(bytes);
assert(frames.length === 1, 'valid image must load');
const sample = {width: 2, height: 2, hotX: 0, hotY: 0, channels: 4, rowstride: 8,
    pixels: new Uint8Array([128,64,32,255, 128,64,32,128, 99,88,77,0, 0,0,0,0])};
assert(matchesArrow(frames, sample), 'matching premultiplied image');
assert(!matchesArrow(frames, {...sample, hotX: 1}), 'hotspot mismatch');
assert(!matchesArrow([], sample), 'unknown theme must remain native');
const other = {...sample, pixels: sample.pixels.slice()};
other.pixels[0] = 255;
assert(!matchesArrow(frames, other), 'different glyph with same size/hotspot must stay native');
other.pixels = sample.pixels.slice(); other.pixels[7] = 127;
assert(!matchesArrow(frames, other), 'different alpha silhouette must stay native');
for (let size = 0; size < bytes.length; size++)
    assert(parseXcursor(bytes.slice(0, size)).length === 0, `truncated file ${size}`);
const malformed = bytes.slice(); new DataView(malformed.buffer).setUint32(44, 0xffffffff, true);
assert(parseXcursor(malformed).length === 0, 'oversized image rejected');

const gate = new ArrowApproval();
const arrow = {}, text = {};
let finish;
const pending = gate.check(arrow, () => new Promise(resolve => { finish = resolve; }));
gate.invalidate(); // Text cursor arrives while arrow readback is pending.
finish(true); await pending;
assert(gate.approved === null, 'stale arrow result must not replace text cursor');
await gate.check(text, async () => false);
assert(gate.approved === null && gate.rejected === text, 'non-arrow remains native');
await gate.check(arrow, async () => true);
assert(gate.approved === arrow, 'verified arrow may animate');
gate.invalidate();
assert(gate.approved === null, 'shape change/disable revokes approval immediately');
await gate.check(arrow, async () => { throw new Error('GPU readback failed'); });
assert(gate.approved === null && gate.rejected === arrow, 'readback failure stays native');
print('PASS arrow identity: pixels, hotspot, unknown/malformed input, stale async results and errors');
