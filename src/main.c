#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <unistd.h>
#include <openssl/mem.h>
#include "util.h"

int main() {
  size_t file_size;
  uint8_t* file_body;
  char FILE_NAME[] = "trust_token_key.json";
  if (!read_file(FILE_NAME, &file_body, &file_size)) {
    fprintf(stderr, "failed to read file %s\n", FILE_NAME);
    exit(1);
  };
  fprintf(stderr, "file_size:\t%ld bytes\n%s\n", file_size, file_body);
}
