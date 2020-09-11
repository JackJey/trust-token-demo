CC := gcc
CFLAGS := -I./boringssl/include -L./boringssl/build/crypto -lcrypto -lpthread

all:
	make trust_token
	make key_generator
	make issue
	make redemption

trust_token: c/trust_token.c
	$(CC) c/trust_token.c -o ./bin/trust_token $(CFLAGS)
	./bin/trust_token


key_generator: c/util.o
	$(CC) c/key_generator.c -o ./bin/key_generator c/util.o $(CFLAGS)

issue: c/util.o
	$(CC) c/issue.c -o ./bin/issue c/util.o $(CFLAGS)

redemption: c/util.o
	$(CC) c/redemption.c -o ./bin/redemption c/util.o $(CFLAGS)


util.o:
	$(CC) -c c/util.c -o./c/util.o $(CFLAGS)

main: c/util.o
	$(CC) c/main.c -o ./bin/main c/util.o $(CFLAGS)
	./bin/main



.PHONY: generate_key, clean
generate_key:
	./bin/key_generator 2>/dev/null 1>./trust_token_key.json

clean:
	rm -f ./bin/*
