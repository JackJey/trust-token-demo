# Trust Token demo

[Trust Tokens](https://github.com/WICG/trust-token-api) is a new API to convey trust from one context to another without passive tracking, in order to help combat fraud and distinguish bots from real humans.

Trust tokens enable an origin to issue cryptographic tokens to a user it trusts. Tokens are stored by the user's browser, and can later be redeemed in other contexts to confirm that the user is a real human.

For example, authenticity established for a user on a social media or email site can be conveyed to another site such as a news publisher or online store.

Find out more: [Getting started with Trust Tokens](https://web.dev/trust-tokens).

This repo provides code to demonstrate Trust Token using [BoringSSL](https://boringssl.googlesource.com/boringssl/)
to create an issuance service.

You can try out this demo online at [trust-token-demo.glitch.me](https://trust-token-demo.glitch.me/)
or download, build and run it yourself.

Find out more: [Getting started with Trust Tokens](https://web.dev/trust-tokens/).

---

**Please note: this demo does not provide code suitable for production use. The Trust Tokens API is still experimental, and is undergoing an [origin trial](https://web.dev/origin-trials) in Chrome. The Trust Tokens API and this demo may change without notice at any time.**

**Also be aware that the demo enables both [issuance and redemption](https://github.com/WICG/trust-token-api#trust-token-issuance), whereas in real-world applications, issuers (sites that issue tokens) are likely to be different from redeemers (sites that redeem tokens).**

**This is not a Google product.**

---

## Install and run this demo

The following instructions are oriented to a Linux environment.

Note that it takes several minutes to download the code, install and build BoringSSL (and cmake if
necessary).

### Get an origin trial token

The Trust Token API is currently available as a [Chrome origin trial](https://web.dev/origin-trials).
You can try out Trust Tokens online at [trust-token-demo.glitch.me](https://trust-token-demo.glitch.me/).

However, to run the demo yourself, you will need to [register for a Trust Token origin trial token](https://developers.chrome.com/origintrials/#/view_trial/2479231594867458049).

### Download the code

```sh
git clone git@github.com:JackJey/trust-token-demo.git
```

All the commands below should be run from the top-level `trust-token-demo` directory:

```sh
cd trust-token-demo
```

### If necessary, install cmake

To build this demo you will need the [cmake build tool](https://cmake.org/download/).

### Install BoringSSL

Run the [install-boringssl.sh](install-boringssl.sh) script to download and build BoringSSL:

```sh
./install-boringssl.sh
```

### Build executables

Build the executable files required for the demo, using the BoringSSL library and the C files in
the [src](src) directory as defined in the [Makefile](Makefile):

```sh
make
```

### Install Node dependencies

The demo uses the Express HTTP server and other dependencies defined in [package.json](package.json).

```sh
npm install
```

### Run the demo server

Run `npm start` (defined in [server.js](server.js)) to start the demo server.

```sh
npm start
```

### Open the demo page

Open [localhost:8000](http://localhost:8000) to view the demo page defined in [index.html](index.html).
By default, this demo runs on port 8000. You can change this by updating the `scripts.start` value in
[package.json](package.json).

## API details

### Key commitment

```
GET /.well-known/trust-token/key-commitment
```

`key-commitment` in JSON format used by the browser.

### Issue request

```
POST /.well-known/trust-token/request
```

Trust Token issuance request endpoint.

### Redemption

```
POST /.well-known/trust-token/redemption
```

SRR token redemption request endpoint.

### Send SRR

```
POST /.well-known/trust-token/send-srr
```

Send SRR endpoint. This echoes back a `Sec-Signed-Redemtption-Record` header which the client can send
as a response.

## Commands and flags

[bin/main](./bin/main) is the build result of [src/main.c](src/main.c).

There is a flag for each Trust Token operation:

```sh
$ main --issue $REQUEST
$ main --redeem $REQUEST
$ main --key-generate
```

### --issue

Take an issuance request (`Sec-Trust-Token HTTP Header`) and return an issuance response.

### --redeem

Take a redemption request (`Sec-Trust-Token HTTP Header`) and return a redemption response.

### --key-generate

Generate private/public keys for a Trust Token and [ED25519](https://ed25519.cr.yp.to/) key pair
and save them in the [./keys](./keys) directory.

## Find out more

- [Getting started with Trust Tokens](https://web.dev/trust-tokens/)
- [Trust Token API explainer](https://github.com/WICG/trust-token-api)
- [The Chromium Projects: Trust Token API](https://www.chromium.org/updates/trust-token)
- [Origin Trials Guide for Web Developers](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md)
- [BoringSSL](https://boringssl.googlesource.com/boringssl/)
