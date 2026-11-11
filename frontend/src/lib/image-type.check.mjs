import assert from "node:assert/strict";
import { sniffImage } from "./image-type.ts";

const bytes = (...parts) => new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

assert.deepEqual(sniffImage(bytes([0xff, 0xd8, 0xff, 0xe0])), { type: "image/jpeg", ext: "jpg" });
assert.deepEqual(sniffImage(bytes([0x89], "PNG\r\n\x1a\n", [0])), { type: "image/png", ext: "png" });
assert.deepEqual(sniffImage(bytes("RIFF", [1, 2, 3, 4], "WEBPVP8 ")), { type: "image/webp", ext: "webp" });
assert.equal(sniffImage(bytes("RIFF", [1, 2, 3, 4], "WAVE")), null, "RIFF that is not WebP");
assert.equal(sniffImage(bytes([0x89], "PNG")), null, "truncated PNG signature");
assert.equal(sniffImage(bytes("<svg xmlns=")), null, "SVG is refused");
assert.equal(sniffImage(bytes("GIF89a")), null, "GIF is refused");
assert.equal(sniffImage(new Uint8Array()), null, "empty file");
console.log("image-type checks passed");
