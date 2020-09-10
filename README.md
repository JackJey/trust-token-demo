# Trust Token DEMO

DEMO of Trust Token API based on boringssl.

## How to use

1. open Google Chrome Canary &gt; M87 with flag shown in page
2. click Yes button for "Are you a human"
3. you can see Redemption Record in page

## API

### Key Commitment

```
GET /.well-known/trust-token/key-commitment
```

key-commitments in JSON format for browser.


### Issue Request

```
POST /.well-known/trust-token/request
```

Trust Token Issue request endpoint


### Redemption

```
POST /.well-known/trust-token/redemption
```

SRR Token Redemption request endpoint


### Send SRR

```
POST /.well-known/trust-token/send-srr
```

Send SRR endpoint, which echo back Sec-Signed-Redemtption-Record header which client sends  as response.
