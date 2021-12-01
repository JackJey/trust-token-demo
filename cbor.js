// CBOR encoder

// Text String (type 3)
function text_string(str) {
  const length = str.length
  const head = len(length)
  const type = (3 << 5)
  head[0] += type
  const encoder = new TextEncoder()
  const bin = encoder.encode(str)
  return new Uint8Array([...head, ...bin])
}

// Byte String (type 2)
function byte_string(byte) {
  const length = byte.length
  const head = len(length)
  const type = (2 << 5)
  head[0] += type
  return new Uint8Array([...head, ...byte])
}

// Map (type 5)
export function map(m) {
  const head = len(m.size)
  const type = (5 << 5)
  head[0] += type

  const keys = Array.from(m.keys()).sort((a, b) => {
    if (a.length === b.length) {
      return (a < b) ? -1 : 1
    }
    return (a.length < b.length) ? -1 : 1
  })

  for (const k of keys) {
    const v = m.get(k)
    head.push(...text_string(k))

    if (v instanceof Uint8Array) {
      head.push(...byte_string(v))
    }
    if (typeof v === 'string') {
      head.push(...text_string(v))
    }
  }

  return head
}

function len(length) {
  if (length < 24) return [length]
  if (length < 255) return [24, length]
  throw 'not supported'
}