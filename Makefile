CC := gcc
CFLAGS := -I./boringssl/include -L./boringssl/build/crypto -lcrypto -lpthread
OBJS = src/util.o src/issue.o src/redeem.o src/key_generator.o
MAIN = bin/main
.SUFFIXES: .c .o

.c.o:
	$(CC) $(CFLAGS) -c $< -o $@

all: main

main: $(OBJS) src/config.h
	$(CC) src/main.c -o $(MAIN) $(OBJS) $(CFLAGS)

example: src/example.c src/config.h
	$(CC) src/example.c -o ./bin/example src/util.o $(CFLAGS)
	./bin/example

example.v2: src/example.v2.c src/config.h
	$(CC) src/example.v2.c -o ./bin/example.v2 src/util.o $(CFLAGS)
	./bin/example.v2

.PHONY: generate_key, clean, test
generate_key:
	$(MAIN) --key-generate

test:
	$(MAIN) --issue AAMEpmE5Mg3KAqlAh3BaBMxHMqY9kHvMBrP+EhA+772dleG4/FmneD0evZbGsNKdA24ARfD/Rk3AiPscif9ybnNOwAarUC8202Y9sgnm3oCdpc1yNlqQgHkW+cLb9CDGqkB1BHuOaDAZqSo084VCXoQqOb6wbySjDlKzlOBdhX8v6jxJdhVA6K/usdz5IuiDDgAODNUIUGwriuJz469s1Ui/tn0oGlimkQ771u8EjWaeq/iLMzA53ohQEP2QiBxkBl4S/ATOJ64Mrlify6IE3XJb6dqpO4EEztArabm5rAiY6RJK7Ay8vqrcCJcOHR/X/nPLtfXxg2k4IeAwpyUgSQGhJR4Su7YbhDl87t2uTB+PGwBpHtJvoS2sF70fBXdK9c1RIj4=

clean:
	$(RM) $(OBJS) bin/*
