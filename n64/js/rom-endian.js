/**
 * N64 ROM byte-order helpers.
 * Target internal format: big-endian .z64 (magic 0x80371240).
 * Also accepts .n64 (little-endian) and .v64 (byte-swapped / mid).
 */
(function (global) {
  const MAGIC_Z64 = 0x80371240; // big-endian
  const MAGIC_N64 = 0x40123780; // little-endian
  const MAGIC_V64 = 0x37804012; // byteswapped

  function readU32BE(u8, off) {
    return ((u8[off] << 24) | (u8[off + 1] << 16) | (u8[off + 2] << 8) | u8[off + 3]) >>> 0;
  }

  function swap32(u8) {
    const out = new Uint8Array(u8.length);
    for (let i = 0; i + 3 < u8.length; i += 4) {
      out[i] = u8[i + 3];
      out[i + 1] = u8[i + 2];
      out[i + 2] = u8[i + 1];
      out[i + 3] = u8[i];
    }
    // copy leftover bytes if any
    for (let i = u8.length - (u8.length % 4); i < u8.length; i++) out[i] = u8[i];
    return out;
  }

  function swap16(u8) {
    const out = new Uint8Array(u8.length);
    for (let i = 0; i + 1 < u8.length; i += 2) {
      out[i] = u8[i + 1];
      out[i + 1] = u8[i];
    }
    if (u8.length % 2) out[u8.length - 1] = u8[u8.length - 1];
    return out;
  }

  function detectFormat(u8) {
    if (!u8 || u8.length < 4) return 'unknown';
    const m = readU32BE(u8, 0);
    if (m === MAGIC_Z64) return 'z64';
    if (m === MAGIC_N64) return 'n64';
    if (m === MAGIC_V64) return 'v64';
    return 'unknown';
  }

  /**
   * Convert any common N64 dump endianness to big-endian z64 bytes.
   */
  function toZ64(u8) {
    const fmt = detectFormat(u8);
    if (fmt === 'z64') return { data: u8, format: fmt };
    if (fmt === 'n64') return { data: swap32(u8), format: fmt };
    if (fmt === 'v64') return { data: swap16(u8), format: fmt };
    // Unknown: leave as-is (may still boot if core tolerates it)
    return { data: u8, format: fmt };
  }

  global.RomEndian = { detectFormat, toZ64, MAGIC_Z64, MAGIC_N64, MAGIC_V64 };
})(typeof window !== 'undefined' ? window : globalThis);
