// setup
// $ npm install
//
// run
// $ npm test

import {map} from "./cbor.js";
import {ecdsaDERToFixedWidth} from "./der.js";
import { webcrypto, verify, KeyObject } from 'crypto';
import * as sfv from "structured-field-values";
import { promisify } from "util";

function hex(bin) {
  return Array.from(bin).map((n) => {
    return n.toString(16).padStart(2, '0')
  }).join(' ')
}

// chrome canary M100
const headers = {
  connection: 'close',
  host: 'trust-token-redeemer-demo.glitch.me',
  'content-length': '0',
  pragma: 'no-cache',
  'cache-control': 'no-cache',
  'sec-ch-ua': '"Chromium";v="100", "Google Chrome";v="100", "(Not:A-Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4700.0 Safari/537.36',
  'sec-ch-ua-platform': '"macOS"',
  accept: '*/*',
  origin: 'https://trust-token-redeemer-demo.glitch.me',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-mode': 'cors',
  'sec-fetch-dest': 'empty',
  'sec-trust-tokens-additional-signing-data': 'additional_signing_data',
  'signed-headers': 'sec-redemption-record,sec-time,sec-trust-tokens-additional-signing-data',
  'sec-redemption-record': '"https://trust-token-issuer-demo.glitch.me";redemption-record=:eyJwdWJpY19tZXRhZGF0YSI6IDEsICJwcml2YXRlX21ldGFkYXRhIjogMH0=:',
  'sec-time': '2021-11-13T11:49:53.212Z',
  'sec-signature': 'signatures=("https://trust-token-issuer-demo.glitch.me";public-key=:BEq5ZCqPw45mme+Tjt7C1Xs9cPKGmaGADZMNmK2eTqT3FaNF+GibRIuFO48aRE1yfomTK7DOTPPnjTf8aPjo/gA=:;sig=:MEQCIAncKoQImFwKYplJ90DxOR+Yk3cu+aq5lw4W1ipSgSNlAiBjnFNIPdLoapbwOaL5/9OI/1xe4MHuQYrxJYFsnBy89w==:;alg="ecdsa_secp256r1_sha256"), sign-request-data=include',
  'sec-trust-token-version': 'TrustTokenV3',
  referer: 'https://trust-token-redeemer-demo.glitch.me/',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'en-US,en;q=0.9,ja;q=0.8',
  'x-forwarded-host': 'trust-token-redeemer-demo.glitch.me',
  traceparent: '00-13e292de42e147719024ed500a9aa594-4b217ad6776db57e-01'
}

const SecSignature = sfv.decodeDict(headers["sec-signature"])
console.log({ SecSignature })
// {
//   SecSignature: {
//     signatures: Item { value: [Array], params: null },
//     'sign-request-data': Item { value: Symbol(include), params: null }
//   }
// }

const signature = SecSignature.signatures.value[0]
console.log(signature)
// Item {
//   value: 'https://trust-token-issuer-demo.glitch.me',
//   params: {
//     'public-key': Uint8Array(65) [
//         4,  74, 185, 100,  42, 143, 195, 142, 102, 153, 239,
//       147, 142, 222, 194, 213, 123,  61, 112, 242, 134, 153,
//       161, 128,  13, 147,  13, 152, 173, 158,  78, 164, 247,
//        21, 163,  69, 248, 104, 155,  68, 139, 133,  59, 143,
//        26,  68,  77, 114, 126, 137, 147,  43, 176, 206,  76,
//       243, 231, 141,  55, 252, 104, 248, 232, 254,   0
//     ],
//     sig: Uint8Array(70) [
//        48,  68,   2,  32,   9, 220,  42, 132,   8, 152,  92,  10,
//        98, 153,  73, 247,  64, 241,  57,  31, 152, 147, 119,  46,
//       249, 170, 185, 151,  14,  22, 214,  42,  82, 129,  35, 101,
//         2,  32,  99, 156,  83,  72,  61, 210, 232, 106, 150, 240,
//        57, 162, 249, 255, 211, 136, 255,  92,  94, 224, 193, 238,
//        65, 138, 241,  37, 129, 108, 156,  28, 188, 247
//     ],
//     alg: 'ecdsa_secp256r1_sha256'
//   }
// }

const sig = signature.params.sig
const public_key = signature.params["public-key"]
const canonical_request_data = new Map([
  ["destination", headers["host"]],
  ["sec-redemption-record", headers["sec-redemption-record"]],
  ["sec-time", headers["sec-time"]],
  ["sec-trust-tokens-additional-signing-data", headers["sec-trust-tokens-additional-signing-data"]],
  ["public-key", public_key],
]);

console.log({ canonical_request_data })
// {
//   canonical_request_data: Map(5) {
//     'destination' => 'trust-token-redeemer-demo.glitch.me',
//     'sec-redemption-record' => '"https://trust-token-issuer-demo.glitch.me";redemption-record=:eyJwdWJpY19tZXRhZGF0YSI6IDEsICJwcml2YXRlX21ldGFkYXRhIjogMH0=:',
//     'sec-time' => '2021-11-13T11:49:53.212Z',
//     'sec-trust-tokens-additional-signing-data' => 'additional_signing_data',
//     'public-key' => Uint8Array(65) [
//         4,  74, 185, 100,  42, 143, 195, 142, 102, 153, 239,
//       147, 142, 222, 194, 213, 123,  61, 112, 242, 134, 153,
//       161, 128,  13, 147,  13, 152, 173, 158,  78, 164, 247,
//        21, 163,  69, 248, 104, 155,  68, 139, 133,  59, 143,
//        26,  68,  77, 114, 126, 137, 147,  43, 176, 206,  76,
//       243, 231, 141,  55, 252, 104, 248, 232, 254,   0
//     ]
//   }
// }

const cbor_data = map(canonical_request_data);
const prefix = Buffer.from(headers["sec-trust-token-version"])
const signing_data = new Uint8Array([...prefix, ...cbor_data])

console.log({ signing_data })
// {
//   signing_data: Uint8Array(391) [
//     84, 114, 117, 115, 116, 84, 111, 107, 101, 110, 86, 51, 165, 107, 100, 101,
//     115, 116, 105, 110, 97, 116, 105, 111, 110, 120, 35, 116, 114, 117, 115, 116,
//     45, 116, 111, 107, 101, 110, 45, 114, 101, 100, 101, 101, 109, 101, 114, 45,
//     100, 101, 109, 111, 46, 103, 108, 105, 116, 99, 104, 46, 109, 101, 117, 115,
//     101, 99, 45, 114, 101, 100, 101, 109, 112, 116, 105, 111, 110, 45, 114, 101,
//     99, 111, 114, 100, 120, 124, 34, 104, 116, 116, 112, 115, 58, 47, 47, 116,
//     114, 117, 115, 116, 45, 116, 111, 107, 101, 110, 45, 105, 115, 115, 117, 101,
//     114, 45, 100, 101, 109, 111, 46, 103, 108, 105, 116, 99, 104, 46, 109, 101,
//     34, 59, 114, 101, 100, 101, 109, 112, 116, 105, 111, 110, 45, 114, 101, 99,
//     111, 114, 100, 61, 58, 101, 121, 74, 119, 100, 87, 74, 112, 89, 49, 57, 116,
//     90, 88, 82, 104, 90, 71, 70, 48, 89, 83, 73, 54, 73, 68, 69, 115, 73, 67, 74,
//     119, 99, 109, 108, 50, 89, 88, 82, 108, 88, 50, 49, 108, 100, 71, 70, 107, 89,
//     88, 82, 104, 73, 106, 111, 103, 77, 72, 48, 61, 58, 104, 115, 101, 99, 45,
//     116, 105, 109, 101, 120, 24, 50, 48, 50, 49, 45, 49, 49, 45, 49, 51, 84, 49,
//     49, 58, 52, 57, 58, 53, 51, 46, 50, 49, 50, 90, 120, 40, 115, 101, 99, 45,
//     116, 114, 117, 115, 116, 45, 116, 111, 107, 101, 110, 115, 45, 97, 100, 100,
//     105, 116, 105, 111, 110, 97, 108, 45, 115, 105, 103, 110, 105, 110, 103, 45,
//     100, 97, 116, 97, 119, 97, 100, 100, 105, 116, 105, 111, 110, 97, 108, 95,
//     115, 105, 103, 110, 105, 110, 103, 95, 100, 97, 116, 97, 106, 112, 117, 98,
//     108, 105, 99, 45, 107, 101, 121, 88, 65, 4, 74, 185, 100, 42, 143, 195, 142,
//     102, 153, 239, 147, 142, 222, 194, 213, 123, 61, 112, 242, 134, 153, 161, 128,
//     13, 147, 13, 152, 173, 158, 78, 164, 247, 21, 163, 69, 248, 104, 155, 68, 139,
//     133, 59, 143, 26, 68, 77, 114, 126, 137, 147, 43, 176, 206, 76, 243, 231, 141,
//     55, 252, 104, 248, 232, 254, 0,
//   ]
// }

const key = await webcrypto.subtle.importKey(
  "raw",
  public_key,
  {
    name: "ECDSA",
    namedCurve: "P-256"
  },
  true,
  ["verify"]
);
console.log({ key })
// {
//   key: CryptoKey {
//     type: 'public',
//     extractable: true,
//     algorithm: { name: 'ECDSA', namedCurve: 'P-256' },
//     usages: [ 'verify' ]
//   }
// }

// verify by WebCrypto
const der = ecdsaDERToFixedWidth(sig, 32)
const result = await webcrypto.subtle.verify({
  name: "ECDSA",
  hash: "SHA-256",
}, key, der, signing_data);
console.log({ result }) // true

// verify by Node Crypto
const key_object = KeyObject.from(key);
console.log(key_object)
const result2 = await promisify(verify)('SHA256', signing_data, key_object, sig)
console.log({ result2 })
