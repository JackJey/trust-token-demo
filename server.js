/* Copyright 2020 Google LLC. SPDX-License-Identifier: Apache-2.0 */

import { map } from "./cbor.js";
import { promisify } from "util";
import { webcrypto, verify, KeyObject } from 'crypto';
import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as sfv from "structured-field-values";
import express from "express";

const exec = promisify(childProcess.exec);

const { trust_token } = JSON.parse(fs.readFileSync("./package.json"));
const { ISSUER, REDEEMER, TRUST_TOKEN_VERSION, protocol_version, batchsize, expiry, id } = trust_token;
const Y = fs.readFileSync("./keys/pub_key.txt").toString().trim();
const BASE64FORMAT = /^[a-zA-Z0-9+/=]+$/
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const app = express();


app.get("/", async (req, res) => {
  console.log(req.headers.host)
  if (req.headers.host === "trust-token-demo.glitch.me") {
    return res.sendFile(__dirname + "/public/html/index.html");
  }
  if (req.headers.host === "trust-token-redeemer-demo.glitch.me") {
    return res.sendFile(__dirname + "/public/html/redeemer.html");
  }
  if (req.headers.host === "trust-token-issuer-demo.glitch.me") {
    return res.sendFile(__dirname + "/public/html/issuer.html");
  }
});

app.use(express.static("."));

app.get("/.well-known/trust-token/key-commitment", (req, res) => {
  console.log(req.path);

  const key_commitment = {}
  key_commitment[protocol_version] = {
    id,
    protocol_version,
    batchsize,
    keys: {
      "1": { Y, expiry }
    }
  };

  res.set({
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8"
  });

  const json = JSON.stringify(key_commitment, "", " ");
  res.send(json);
});

app.post(`/.well-known/trust-token/issuance`, async (req, res) => {
  console.log(req.path);
  const sec_trust_token = req.headers["sec-trust-token"];
  console.log({ sec_trust_token });
  if (sec_trust_token.match(BASE64FORMAT) === null) {
    return res.status(400).send("invalid trust token");
  }
  const result = await exec(`./bin/main --issue ${sec_trust_token}`);
  const token = result.stdout;
  console.log({ token })
  res.set({ "Access-Control-Allow-Origin": "*" });
  res.append("sec-trust-token", token);
  res.send();
});

app.post(`/.well-known/trust-token/redemption`, async (req, res) => {
  console.log(req.path);
  console.log(req.headers);
  const sec_trust_token_version = req.headers["sec-trust-token-version"];
  if (sec_trust_token_version !== protocol_version) {
    return res.send(400).send("unsupported trust token version");
  }
  const sec_trust_token = req.headers["sec-trust-token"];
  if (sec_trust_token.match(BASE64FORMAT) === null) {
    return res.status(400).send("invalid trust token");
  }
  const result = await exec(`./bin/main --redeem ${sec_trust_token}`);
  const token = result.stdout;
  res.set({ "Access-Control-Allow-Origin": "*" });
  res.append("sec-trust-token", token);
  res.send();
});

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

  // verify sec-signature
  const canonical_request_data = new Map([
    ["destination", REDEEMER],
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

  res.set({ "Access-Control-Allow-Origin": "*" });
  res.send({ sig_verify });
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
