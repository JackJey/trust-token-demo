/* Copyright 2020 Google LLC. SPDX-License-Identifier: Apache-2.0 */

import * as path from "path";
import * as sfv from "structured-field-values";
import express from "express";
import { webcrypto, verify, KeyObject } from 'crypto';
import { promisify } from "util";
import { map } from "./cbor.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const app = express();


app.get("/", async (req, res) => {
  console.log(req.headers.host)
  if (req.headers.host === "trust-token-demo.glitch.me") {
    return res.sendFile(__dirname + "/index.html");
  }
  if (req.headers.host === "trust-token-redeemer-demo.glitch.me") {
    return res.sendFile(__dirname + "/redeemer.html");
  }
  if (req.headers.host === "trust-token-issuer-demo.glitch.me") {
    return res.sendFile(__dirname + "/issuer.html");
  }
});

app.use(express.static("."));

app.post(`/.well-known/trust-token/send-rr`, async (req, res) => {
  console.log(req.path);

  const headers = req.headers;
  console.log({ headers });

  // sec-redemption-record
  // [(<issuer 1>, {"redemption-record": <SRR 1>}),
  //  (<issuer N>, {"redemption-record": <SRR N>})],
  const rr = sfv.decodeList(headers["sec-redemption-record"]);
  console.log({ rr })

  const { value, params } = rr[0];
  const redemption_record = Buffer.from(params["redemption-record"]).toString();
  console.log({ redemption_record });

  // verify client_public_key
  const sec_signature = sfv.decodeDict(headers["sec-signature"]);
  const signatures = sec_signature.signatures.value[0];
  const client_public_key = signatures.params["public-key"];
  const sig = signatures.params["sig"];

  console.log({ sec_signature });
  console.log({ signatures })
  console.log({ client_public_key });
  console.log({ sig });

  const destination = "trust-token-redeemer-demo.glitch.me";

  // verify sec-signature
  const canonical_request_data = new Map([
    ["destination", destination],
    ["sec-redemption-record", headers["sec-redemption-record"]],
    ["sec-time", headers["sec-time"]],
    ["sec-trust-tokens-additional-signing-data", headers["sec-trust-tokens-additional-signing-data"]],
    ["public-key", client_public_key],
  ]);

  console.log(canonical_request_data)

  const cbor_data = map(canonical_request_data);
  const prefix = Buffer.from(headers["sec-trust-token-version"])
  console.log({ prefix })
  const signing_data = new Uint8Array([...prefix, ...cbor_data]);

  console.log({
    sig,
    signing_data,
    client_public_key,
    sig_len: sig.length,
    signing_data_len: signing_data.length,
    client_public_key_len: client_public_key.length
  })

  const key = await webcrypto.subtle.importKey(
    'raw',
    client_public_key,
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    true,
    ['verify']
  );

  console.log(key)

  // verify by Node Crypto
  const key_object = KeyObject.from(key);
  console.log(key_object)

  const sig_verify = await promisify(verify)('SHA256', signing_data, key_object, sig)
  console.log({ sig_verify });

  res.set({
    "Access-Control-Allow-Origin": "*"
  });

  res.send({ sig_verify });
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
