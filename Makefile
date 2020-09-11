CC := gcc
CFLAGS := -I./boringssl/include -L./boringssl/build/crypto -lcrypto -lpthread

all:
	make trust_token
	make key_generator
	make issue
	make redemption

trust_token: src/trust_token.c
	$(CC) src/trust_token.c -o ./bin/trust_token $(CFLAGS)
	./bin/trust_token


key_generator: src/util.o
	$(CC) src/key_generator.c -o ./bin/key_generator src/util.o $(CFLAGS)

issue: src/util.o
	$(CC) src/issue.c -o ./bin/issue src/util.o $(CFLAGS)

redemption: src/util.o
	$(CC) src/redemption.c -o ./bin/redemption src/util.o $(CFLAGS)


util.o:
	$(CC) -c src/util.c -o./src/util.o $(CFLAGS)

main: src/util.o
	$(CC) src/main.c -o ./bin/main src/util.o $(CFLAGS)
	./bin/main



.PHONY: generate_key, clean
generate_key:
	./bin/key_generator 2>/dev/null 1>./trust_token_key.json

clean:
	rm -f ./bin/*
