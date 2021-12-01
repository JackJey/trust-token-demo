/* Copyright 2020 Google LLC. SPDX-License-Identifier: Apache-2.0 */

"use strict";
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
EventTarget.prototype.on = EventTarget.prototype.addEventListener;

function base64decode(str) {
  return new Uint8Array([...atob(str)].map(a => a.charCodeAt(0)));
}

document.on("DOMContentLoaded", async e => {
  const ISSUER = location.origin;

  $("#yes").on("click", async () => {
    $("#issuing").style.visibility = "visible";

    // issuer request
    await fetch("/.well-known/trust-token/issuance", {
      method: "POST",
      trustToken: {
        type: "token-request",
        issuer: ISSUER
      }
    });

    // check token exists
    const token = await document.hasTrustToken(ISSUER);
    console.log(token);

    if (token) {
      $("#issued").style.visibility = "visible";
    } else {
      // TODO: failure case
    }

    $("#back").style.visibility = "visible";

    setTimeout(() => {
      const query = new URLSearchParams(location.search);
      const back = query.get("back");
      if (back) {
        location.href = back; // open redirecter !!?
      }
    }, 1000);
  });

  $("#refresh").on("click", async () => {
    try {
      while (await document.hasTrustToken(ISSUER)) {
        // redemption request
        await fetch(`${ISSUER}/.well-known/trust-token/redemption`, {
          method: "POST",
          trustToken: {
            type: "token-redemption",
            issuer: ISSUER,
            refreshPolicy: "refresh"
          }
        });

        // send SRR and echo Sec-Eedemption-Record
        const res = await fetch(`${ISSUER}/.well-known/trust-token/send-rr`, {
          method: "POST",
          headers: new Headers({
            "Signed-Headers": "sec-redemption-record, sec-time"
          }),

          trustToken: {
            type: "send-redemption-record",
            issuers: [ISSUER],
            refreshPolicy: "refresh",
            includeTimestampHeader: true,
            signRequestData: "include",
            additionalSigningData: "additional_signing_data"
          }
        });

        const body = await res.json();
        console.log(JSON.stringify(body, " ", " "));
      }
    } catch (err) {
      console.error(err);
    }
    console.log("token cleared");
  });
});
