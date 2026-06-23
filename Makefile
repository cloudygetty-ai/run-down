CXX      := g++
CXXFLAGS := -std=c++17 -O2 -Wall -Wextra
TARGET   := rundown

all: $(TARGET)

$(TARGET): main.cpp src/*.h
	$(CXX) $(CXXFLAGS) main.cpp -o $(TARGET)

sim: $(TARGET)
	./$(TARGET) --sim

clean:
	rm -f $(TARGET)

.PHONY: all sim clean
