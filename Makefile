all: cpp/rundown

cpp/rundown: cpp/main.cpp cpp/include/*.h
	g++ -std=c++17 -Wall -Wextra -O2 -Icpp/include cpp/main.cpp -o cpp/rundown

clean:
	rm -f cpp/rundown

.PHONY: all clean
