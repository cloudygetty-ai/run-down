CXX      ?= g++
CXXFLAGS  = -std=c++17 -Wall -Wextra -O2 -Icpp/include
SRCDIR    = cpp/src
SRCS      = $(wildcard $(SRCDIR)/*.cpp)
OBJS      = $(SRCS:%.cpp=%.o)
TARGET    = cpp/rundown

.PHONY: all clean sim

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) -o $@ $^

$(SRCDIR)/%.o: $(SRCDIR)/%.cpp
	$(CXX) $(CXXFLAGS) -c -o $@ $<

sim: $(TARGET)
	./$(TARGET) --sim

clean:
	rm -f $(SRCDIR)/*.o $(TARGET)
