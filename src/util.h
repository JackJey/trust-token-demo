int read_file(char *file_name, uint8_t **file_body, size_t *file_size);

void hexdump(uint8_t *s, size_t len);

int base64_encode(uint8_t *buff, size_t buff_len,
                  uint8_t **out, size_t *out_len);

int base64_decode(uint8_t *buff, size_t buff_len,
                  uint8_t **out, size_t *out_len);
