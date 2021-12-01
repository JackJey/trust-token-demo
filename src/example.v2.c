// Copyright 2020 Google LLC. SPDX-License-Identifier: Apache-2.0

#include <stdio.h>
#include <stdlib.h>
#include <openssl/base64.h>
#include <openssl/bytestring.h>
#include <openssl/curve25519.h>
#include <openssl/evp.h>
#include <openssl/mem.h>
#include <openssl/rand.h>
#include <openssl/sha.h>
#include <openssl/trust_token.h>
#include "config.h"
#include "util.h"


// V2 VOPRF
int main(int argc, char **argv) {
  const    TRUST_TOKEN_METHOD *method = TRUST_TOKEN_experiment_v2_voprf();
  uint8_t  priv_key[TRUST_TOKEN_MAX_PRIVATE_KEY_SIZE];
  uint8_t  pub_key[TRUST_TOKEN_MAX_PUBLIC_KEY_SIZE];
  size_t   priv_key_len, pub_key_len;
  uint32_t key_id = KEY_ID;

  // generate Trust Token keypair
  // |id|: id for key
  // 1:success, 0:error
  if (!TRUST_TOKEN_generate_key(method,
                                priv_key, &priv_key_len, TRUST_TOKEN_MAX_PRIVATE_KEY_SIZE,
                                pub_key,  &pub_key_len,  TRUST_TOKEN_MAX_PUBLIC_KEY_SIZE,
                                key_id)) {
    fprintf(stderr, "failed to generate TRUST_TOKEN key.\n");
    exit(0);
  }
  fprintf(stderr, "priv_key_len: \t%zu\n", priv_key_len);
  fprintf(stderr, "pub_key_len: \t%zu\n",  pub_key_len);

  // Client Side Implementation
  //
  // generate |TRUST_TOKEN_CLIENT|
  // bactch sould be smaller than |max_batchsize|
  // error if |max_batchsize| is too big
  uint16_t client_max_batchsize = CLIENT_MAX_BATCHSIZE;
  TRUST_TOKEN_CLIENT* client = TRUST_TOKEN_CLIENT_new(method, client_max_batchsize);
  if (!client) {
    fprintf(stderr, "failed to create TRUST_TOKEN Client. maybe max_batchsize(%i) is too large\n", client_max_batchsize);
    exit(0);
  }

  // Issuer Side Implementation
  //
  // |TRUST_TOKEN_ISSUER| is reusable
  // |const| if pointer then no-mutating else mutating
  // bactch sould be smaller than |max_batchsize|
  // error if |max_batchsize| is too big
  uint16_t issuer_max_batchsize = ISSUER_MAX_BATCHSIZE;
  TRUST_TOKEN_ISSUER* issuer = TRUST_TOKEN_ISSUER_new(method, issuer_max_batchsize);
  if (!issuer) {
    fprintf(stderr, "failed to create TRUST_TOKEN Issuer. maybe max_batchsize(%i) is too large\n", issuer_max_batchsize);
    exit(0);
  }

  // add Public Key to Client
  // |*out_key_index| is added index
  // 1:success, 0:error
  size_t key_index;
  if (!TRUST_TOKEN_CLIENT_add_key(client, &key_index, pub_key, pub_key_len)) {
    fprintf(stderr, "failed to add key in TRUST_TOKEN Client.\n");
    exit(0);
  }
  fprintf(stderr, "Public Key has added to Client with index(%zu)\n", key_index);

  // add Private Key to Issuer
  // key sould be generated via |TRUST_TOKEN_generate_key|
  // 1:success, 0:error
  if (!TRUST_TOKEN_ISSUER_add_key(issuer, priv_key, priv_key_len)) {
    fprintf(stderr, "failed to add key in TRUST_TOKEN Issuer.\n");
    exit(0);
  }

  //////////////////////////////////////////////////////////////////////////
  // Ready to Request
  //////////////////////////////////////////////////////////////////////////

  // 1. SRR(Signed Redemption Records) generation
  // Private Metadata (32byte random) for encrypt SRR
  // 1:success, 0:error
  uint8_t metadata_key[32];
  RAND_bytes(metadata_key, sizeof(metadata_key));
  if (!TRUST_TOKEN_ISSUER_set_metadata_key(issuer, metadata_key, sizeof(metadata_key))) {
    fprintf(stderr, "failed to generate trust token metadata key.\n");
    exit(0);
  }

  // 2. Client starts issuing
  // generate trust token by |count|
  // 1:success, 0:error
  uint8_t* request = NULL;
  size_t request_len;
  size_t count = CLIENT_ISSUANCE_COUNT;
  if (!TRUST_TOKEN_CLIENT_begin_issuance(client, &request, &request_len, count)) {
    fprintf(stderr, "failed to begin issuance in TRUST_TOKEN Client.\n");
    exit(0);
  }
  printf("CLIENT(begin_issuance)\trequest(%zu): %p\n", request_len, request);

  // 3. ISSUER issues token
  // save blinded token into |out|/|out_len|
  // save count into |*out_tokens_issued|
  // Token is issued by |public_metadata| & |private_metadata|
  // |public_metadata| is key IDs.
  // |private_metadata| is 0 or 1.
  // 1:success, 0:error
  uint8_t* response = NULL;
  size_t   resp_len, tokens_issued;
  size_t   max_issuance = count;
  uint8_t  public_metadata = KEY_ID;
  uint8_t  private_metadata = ISSUER_PRIVATE_METADATA;
  if (!TRUST_TOKEN_ISSUER_issue(issuer,
                                &response, &resp_len,
                                &tokens_issued,
                                request, request_len,
                                public_metadata,
                                private_metadata,
                                max_issuance)) {
    fprintf(stderr, "failed to issue in TRUST_TOKEN Issuer.\n");
    exit(0);
  }
  printf("ISSUER(issue)\tresponse(%zu): %p\n", resp_len, response);
  printf("ISSUER(issue)\ttokens_issued: %zu\n", tokens_issued);

  // 4. Client get token from |response|
  // |out_key_index| is key index for sign
  // |sk_TRUST_TOKEN_pop_free| if finished
  // empty list if fail
  size_t used_key;
  STACK_OF(TRUST_TOKEN)* tokens = TRUST_TOKEN_CLIENT_finish_issuance(client, &used_key, response, resp_len);
  if (sk_TRUST_TOKEN_num(tokens) < 1) {
    fprintf(stderr, "failed to finish issuance in TRUST_TOKEN Client.\n");
    exit(0);
  }
  printf("CLIENT(finish_issuance)\tused_key: %zu, token count: %li\n", used_key, sk_TRUST_TOKEN_num(tokens));

  // 5. take token
  TRUST_TOKEN* token = sk_TRUST_TOKEN_pop(tokens);
  if (!token) {
    fprintf(stderr, "no token in the stack.\n");
    exit(0);
  }

  // 6. client redemption request
  // |token| redemption request
  // sign |data| and serialize into |out|
  // |time| unix time for issuer response validation
  // 1:success, 0:error
  const uint8_t kClientData[] = CLIENT_REDEMPTION_DATA;
  uint64_t kRedemptionTime    = CLIENT_REDEMPTION_TIME;
  uint8_t  *redeem_request    = NULL;
  size_t   redeem_request_len;
  if (!TRUST_TOKEN_CLIENT_begin_redemption(client,
                                           &redeem_request, &redeem_request_len,
                                           token,
                                           kClientData,
                                           sizeof(kClientData),
                                           kRedemptionTime)) {
    fprintf(stderr, "failed to begin redemption in TRUST_TOKEN Client.\n");
    exit(0);
  }
  fprintf(stderr, "CLIENT(begin_redemption)\tredeem_request(%zu): %p\n", redeem_request_len, &redeem_request);

  // 7. issuer redeem **raw**
  // redeem & verify |request| token
  // if token is valid, public/private metadata extracted
  // to |public_metadata| & |private_metadata|
  // |TRUST_TOKEN| is |out_token|
  // |out_client_data| is client data
  // |*out_redemption_time| is redemption time
  // 1:success, 0:error
  uint32_t out_public;
  uint8_t out_private;
  TRUST_TOKEN *rtoken;
  uint8_t *client_data;
  size_t client_data_len;

  if (!TRUST_TOKEN_ISSUER_redeem_raw(issuer,
                                 &out_public,
                                 &out_private,
                                 &rtoken,
                                 &client_data,
                                 &client_data_len,
                                 redeem_request,
                                 redeem_request_len)) {
    fprintf(stderr, "failed to redeem in TRUST_TOKEN Issuer.\n");
    exit(0);
  }
  fprintf(stderr, "ISSUER(redeem) out_public:       %d\n", out_public);
  fprintf(stderr, "ISSUER(redeem) out_private:      %d\n", out_private);
  fprintf(stderr, "ISSUER(redeem) rtoken:           %p\n", rtoken);
  fprintf(stderr, "ISSUER(redeem) client_data(%zu): %s\n", client_data_len, client_data);
}
