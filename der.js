// DER decoder

function decodeDERSimple(buf, expectTag) {
  if (buf.length < 2) {
    throw "invalid input";
  }
  if (buf[0] != expectTag) {
    throw "tag mismatch";
  }
  // We don't support multi-byte lengths.
  const l = buf[1];
  if (l >= 0x80) {
    throw "invalid length"
  }
  if (buf.length < 2 + l) {
    throw "length too large";
  }
  return [buf.subarray(2, 2 + l), buf.subarray(2 + l)];
}
 
function decodeDERUnsignedInteger(buf) {
  if (buf.length == 0) {
    throw "invalid empty INTEGER";
  }
  if (buf[0] & 0x80) {
    throw "invalid negative INTEGER";
  }
  // Remove the leading zero byte. DER INTEGERs are signed, so they are
  // zero-padded if positive with a high bit. If we do not remove this,
  // ecdsaDERToFixedWidth may think the component is too long.
  if (buf[0] == 0) {
    buf = buf.subarray(1);
    // DER integers must be minimal.
    if (buf.length > 0 && (buf[0] & 0x80) == 0) {
      throw "invalid non-minimal INTEGER";
    }
  }
  return buf;
}
 
// width is the width of one field elmeent for the group. For P-256, it's 32.
export function ecdsaDERToFixedWidth(buf, width) {
  let seq;
  [seq, buf] = decodeDERSimple(buf, 0x30);  // SEQUENCE
  if (buf.length != 0) {
    throw "unexpected trailing data";
  }
  let r, s;
  [r, seq] = decodeDERSimple(seq, 0x02);  // INTEGER
  r = decodeDERUnsignedInteger(r);
  [s, seq] = decodeDERSimple(seq, 0x02);  // INTEGER
  s = decodeDERUnsignedInteger(s);
  if (seq.length != 0) {
    throw "unexpected trailing data";
  }
  if (r.length > width || s.length > width) {
    throw "signature component too long";
  }
  // The result is r and s, left-padded zeros and concatenated.
  const ret = new Uint8Array(2 * width);
  ret.set(r, width - r.length);
  ret.set(s, 2 * width - s.length);
  return ret;
}
