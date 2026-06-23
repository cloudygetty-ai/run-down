// src/platform.h
#pragma once
#ifdef _WIN32
  #include <conio.h>
  #include <windows.h>
  namespace rd {
    inline void platformInit(){
        HANDLE h=GetStdHandle(STD_OUTPUT_HANDLE);
        DWORD m=0; GetConsoleMode(h,&m);
        SetConsoleMode(h,m|ENABLE_VIRTUAL_TERMINAL_PROCESSING);
    }
    inline int  pollKey()       {return _kbhit()?_getch():-1;}
    inline void sleepMs(int ms) {Sleep(ms);}
  }
#else
  #include <termios.h>
  #include <unistd.h>
  #include <fcntl.h>
  #include <thread>
  #include <chrono>
  namespace rd {
    inline void platformInit(){
        termios t{};
        tcgetattr(STDIN_FILENO,&t);
        t.c_lflag&=~(ICANON|ECHO);
        tcsetattr(STDIN_FILENO,TCSANOW,&t);
        fcntl(STDIN_FILENO,F_SETFL,O_NONBLOCK);
    }
    inline int pollKey(){unsigned char c;return(read(STDIN_FILENO,&c,1)==1)?(int)c:-1;}
    inline void sleepMs(int ms){std::this_thread::sleep_for(std::chrono::milliseconds(ms));}
  }
#endif
