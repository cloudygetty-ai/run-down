// src/renderer.h — complete terminal renderer: lobby, story, game, game over
#pragma once
#include "types.h"
#include "world.h"
#include "characters.h"
#ifndef _WIN32
  #include <termios.h>
  #include <unistd.h>
#endif
#include <sstream>
#include <iostream>
#include <iomanip>
#include <vector>
#include <string>
#include <cmath>

namespace rd {

// ── ANSI ──────────────────────────────────────────────────────────────────────
#define RST   "\033[0m"
#define DIM   "\033[2m"
#define BOLD  "\033[1m"
#define RED   "\033[31m"
#define GRN   "\033[32m"
#define YEL   "\033[33m"
#define BLU   "\033[34m"
#define MAG   "\033[35m"
#define CYN   "\033[36m"
#define WHT   "\033[97m"
#define BGRED "\033[41m"
#define BGMAG "\033[45m"

inline const char* rarityColor(Rarity r) {
    switch(r){
        case Rarity::Common:    return WHT;
        case Rarity::Rare:      return BLU;
        case Rarity::Epic:      return MAG;
        case Rarity::Legendary: return YEL;
    }
    return WHT;
}

inline std::string bar(int val, int max, int w, const char* col) {
    int filled=(max>0)?(val*w/max):0;
    std::string s=col;
    for(int i=0;i<w;i++) s+=(i<filled?"█":"░");
    s+=RST;
    return s;
}

// ── Raw input helper (POSIX only) ─────────────────────────────────────────────
#ifndef _WIN32
inline int rawReadKey() {
    unsigned char c=0;
    if (read(STDIN_FILENO,&c,1)!=1) return -1;
    if (c==27){
        unsigned char seq[2]={0,0};
        if (read(STDIN_FILENO,seq,2)==2){
            if (seq[0]=='['&&seq[1]=='A') return 1001; // up
            if (seq[0]=='['&&seq[1]=='B') return 1002; // down
        }
        return 27;
    }
    return (int)c;
}

struct RawMode {
    termios orig;
    RawMode(){
        tcgetattr(STDIN_FILENO,&orig);
        termios raw=orig;
        raw.c_lflag&=~(ICANON|ECHO);
        tcsetattr(STDIN_FILENO,TCSANOW,&raw);
    }
    ~RawMode(){ tcsetattr(STDIN_FILENO,TCSANOW,&orig); }
};
#else
inline int rawReadKey(){ return _getch(); }
struct RawMode{};
#endif

// ════════════════════════════════════════════════════════════════════════════
// SCREEN 1 — STORY / INTRO
// ════════════════════════════════════════════════════════════════════════════
inline void showStoryScreen() {
    RawMode raw;
    const std::vector<std::pair<std::string,std::string>> beats = {
        {
            "HELIX CORPORATION",
            "They rebuilt the world. Then decided who got to live in it.\n\n"
            "After the Resource Collapse of 2041, Helix Corp emerged as the sole\n"
            "architect of civilization — controlling food, medicine, and the orbital\n"
            "infrastructure that kept satellites alive.\n\n"
            "Compliance was not optional.\n"
            "Resistance was logged, catalogued, and eventually... resolved."
        },
        {
            "S.I.G.I.L.",
            "Strategic Interdiction and Guided Impact Lattice.\n\n"
            "A network of kinetic bombardment platforms in low orbit. Each node\n"
            "can place a precision meteorite strike anywhere on the surface\n"
            "within 90 seconds.\n\n"
            "Helix deployed it to end two border conflicts.\n"
            "Then they kept it running.\n"
            "Nobody asked why."
        },
        {
            "THE PROVING GROUND",
            "Operatives who know too much. Defectors. Rivals.\n"
            "Anyone Helix wants gone but can't officially touch.\n\n"
            "They're dropped into a designated zone and the SIGIL clock starts\n"
            "ticking. Only the last one standing leaves.\n\n"
            "Helix calls it \"resolution\".\n\n"
            "Everyone else calls it the Run Down."
        },
        {
            "FRACTURE CORES",
            "Explosive meteor strikes don't just leave craters.\n\n"
            "The kinetic energy fractures local spacetime, crystallizing into\n"
            "dense cores of raw potential. Holding one amplifies your abilities —\n"
            "faster cooldowns, harder hits.\n\n"
            "But the fracture energy is corrosive.\n"
            "Hold it too long and it starts taking something back."
        },
        {
            "HELIX RELAYS",
            "Signal towers scattered across every Proving Ground.\n\n"
            "Helix uses them to coordinate SIGIL targeting. Capture one and\n"
            "you disrupt that coordination — buying time, forcing the bombardment\n"
            "to recalibrate, pulling emergency supply caches from rogue factions\n"
            "who'd love to see Helix lose a node.\n\n"
            "Work the relays. Control the ground."
        },
    };

    for (auto& [title, body] : beats) {
        std::cout << "\033[2J\033[H";
        std::cout << "\n\n";
        std::cout << "  " << BOLD << YEL << title << RST << "\n";
        std::cout << "  " << std::string(60,'=') << "\n\n";
        // Indent body
        std::istringstream ss(body);
        std::string line;
        while (std::getline(ss,line)) std::cout << "  " << DIM << line << RST << "\n";
        std::cout << "\n\n  " << DIM << "[ PRESS ANY KEY ]" << RST << std::flush;
        while (rawReadKey()<0) {}
        rawReadKey(); // consume
    }
}

// ════════════════════════════════════════════════════════════════════════════
// SCREEN 2 — CHARACTER SELECT
// ════════════════════════════════════════════════════════════════════════════
inline int showCharacterSelect() {
    RawMode raw;
    int sel=0;
    const int N=(int)CHARACTERS.size();

    auto draw=[&](){
        std::ostringstream out;
        out << "\033[2J\033[H";
        out << BOLD << YEL << "  ★ THE RUN DOWN — SELECT YOUR OPERATOR ★\n" << RST;
        out << DIM  << "  ↑/↓ navigate   ENTER select\n\n" << RST;

        // Left column: operator list
        for (int i=0;i<N;i++){
            const auto& c=CHARACTERS[i];
            bool active=(i==sel);
            out << (active ? std::string(YEL)+"▶ "+BOLD : std::string(DIM)+"  ")
                << std::left << std::setw(26) << c.name
                << " " << std::setw(16) << c.title
                << RST << "\n";
        }

        // Detail panel for selected
        const auto& C=CHARACTERS[sel];
        out << "\n" << std::string(60,'=') << "\n";
        out << BOLD << WHT << C.name << RST
            << "  " << DIM << C.title << RST << "\n\n";
        out << "  " << DIM << C.lore << RST << "\n\n";
        out << "  " << CYN << "PASSIVE  " << RST << C.passive.description << "\n";
        out << "  " << YEL << "ABILITY  " << RST
            << BOLD << C.ability.name << RST
            << " (" << (int)C.ability.cooldownSec << "s cd)\n";
        out << "  " << DIM << "         " << C.ability.description << RST << "\n";

        // Stat preview
        int maxHp  = 100+C.passive.maxHealthBonus;
        
        out << "\n  HP     " << bar(maxHp,200,12,GRN) << " " << maxHp << "\n";
        out << "  SHIELD " << bar(C.passive.startingShield,100,12,CYN) << " " << C.passive.startingShield << "\n";
        out << "  SPEED  " << bar((int)(C.passive.speedMult*100),150,12,YEL)
            << " " << (int)(C.passive.speedMult*100) << "%\n";
        out << "  DAMAGE " << bar((int)(C.passive.damageMult*100),150,12,RED)
            << " " << (int)(C.passive.damageMult*100) << "%\n";

        std::cout << out.str() << std::flush;
    };

    draw();
    while (true) {
        int k=rawReadKey();
        if (k<0) continue;
        if (k==1001||k=='w'||k=='W') { sel=(sel-1+N)%N; draw(); }
        if (k==1002||k=='s'||k=='S') { sel=(sel+1)%N;   draw(); }
        if (k==10||k==13)            { return sel; }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// SCREEN 3 — GAME HUD
// ════════════════════════════════════════════════════════════════════════════
inline void renderGame(
    const World& world,
    const std::vector<Entity>& entities,
    const std::vector<KillEvent>& killEvents,
    const std::string& feedMsg,
    const std::string& meteorMsg
) {
    std::ostringstream out;
    out << "\033[H";

    const Entity& p=entities[0];
    int alive=0; for (auto& e:entities) if(e.alive) alive++;

    // ── HUD Row 1 ─────────────────────────────────────────────────────────
    out << BOLD << YEL << " ✦ RUN DOWN " << RST
        << "│ HP "   << bar(p.hp,p.maxHp,10,GRN)   << " " << p.hp << "/" << p.maxHp
        << "  SH "   << bar(p.shield,p.maxShield,8,CYN) << " " << p.shield
        << "  │ "    << rarityColor(p.weapon.rarity) << p.weapon.name << RST
        << "[" << p.weapon.ammo << "] "
        << "  │ Mats " << YEL << p.mats << RST
        << "  │ ✦ " << WHT << alive << RST
        << "  │ ☠ "  << RED << p.kills << RST;
    if (p.hasFractureCore) out << "  │ " << MAG << BOLD << "⬡ CORE" << RST;
    out << "\n";

    // ── HUD Row 2 — Ability ───────────────────────────────────────────────
    out << " ABILITY: " << CYN << p.ability.name << RST;
    if (p.ability.active)
        out << " " << GRN << "[ACTIVE " << std::fixed << std::setprecision(1)
            << p.ability.activeLeft << "s]" << RST;
    else if (p.ability.cooldownLeft>0)
        out << " " << DIM << "[" << std::fixed << std::setprecision(1)
            << p.ability.cooldownLeft << "s]" << RST;
    else
        out << " " << YEL << "[E — READY]" << RST;

    out << "   ZONE r=" << (int)world.safeRadius
        << "  SIGIL: ";
    switch(world.meteorPhase){
        case MeteorPhase::Calm:       out << DIM  << "IDLE"       << RST; break;
        case MeteorPhase::Warning:    out << YEL  << "⚠ WARNING"  << RST; break;
        case MeteorPhase::Inbound:    out << RED  << "☄ INBOUND"  << RST; break;
        case MeteorPhase::Impact:     out << BGRED<< " IMPACT "   << RST; break;
        case MeteorPhase::Aftershock: out << MAG  << "~AFTERSHOCK"<< RST; break;
        case MeteorPhase::Clear:      out << DIM  << "CLEARING"   << RST; break;
    }
    if (world.relaysCaptured>0)
        out << "  " << GRN << "RELAY ×" << world.relaysCaptured << RST;
    out << "\n";

    // ── Map ───────────────────────────────────────────────────────────────
    for (int y=0;y<MAP_H;y++){
        for (int x=0;x<MAP_W;x++){
            Vec2 here{(float)x,(float)y};

            // Meteor strike warning zone
            bool inStrike=false;
            for (auto& s:world.strikes)
                if (!s.exploded&&dist2(here,s.pos)<=9.f){inStrike=true;break;}

            // Relay capture progress indicator
            
            bool relayCapturing=false;
            for (auto& r:world.helixRelays){
                if ((int)r.pos.x==x&&(int)r.pos.y==y){
                    // relay
                    relayCapturing=(r.captureTimer>0);
                    break;
                }
            }

            // Entities
            const Entity* drawn=nullptr;
            for (auto& e:entities)
                if(e.alive&&(int)e.pos.x==x&&(int)e.pos.y==y){drawn=&e;break;}

            if (drawn){
                if (drawn->isPlayer){
                    out << (drawn->ability.active ? std::string(GRN)+BOLD+"@"+RST
                                                  : std::string(GRN)+"@"+RST);
                } else {
                    out << (drawn->hasFractureCore ? std::string(MAG)+"X"+RST
                                                   : std::string(RED)+"x"+RST);
                }
                continue;
            }

            if (inStrike){out<<MAG<<"⊙"<<RST;continue;}

            bool storm=world.inStorm(here);
            switch(world.grid[y][x]){
                case Tile::Floor:
                    out<<(storm?std::string(MAG)+"·"+RST:std::string(DIM)+"·"+RST);break;
                case Tile::Wall:   out<<WHT <<"█"<<RST;break;
                case Tile::Tree:   out<<GRN <<"♣"<<RST;break;
                case Tile::Loot:   out<<YEL <<"$"<<RST;break;
                case Tile::Built:  out<<CYN <<"="<<RST;break;
                case Tile::Crater: out<<DIM <<"o"<<RST;break;
                case Tile::Relay:
                    out<<(relayCapturing?std::string(YEL)+BOLD+"▣"+RST
                                        :std::string(BLU)+"▣"+RST);break;
                case Tile::FractureCore:
                    out<<MAG<<BOLD<<"⬡"<<RST;break;
            }
        }
        out<<"\n";
    }

    // ── Controls ─────────────────────────────────────────────────────────
    out<<DIM<<" WASD move │ SPACE shoot │ E ability │ B build │ Q quit"<<RST<<"\n";

    // ── Kill feed ─────────────────────────────────────────────────────────
    for (int i=0;i<2;i++){
        if (i<(int)killEvents.size()){
            auto& k=killEvents[killEvents.size()-1-i];
            out<<" "<<RED<<k.killerName<<RST<<" eliminated "<<DIM<<k.victimName<<RST
               <<"  ["<<k.weapon<<"]\n";
        } else out<<"\n";
    }

    if (!feedMsg.empty())  out<<" "<<feedMsg<<"                    \n";
    else                   out<<"\n";
    if (!meteorMsg.empty()) out<<" "<<YEL<<meteorMsg<<RST<<"              \n";
    else                    out<<"\n";

    std::cout<<out.str()<<std::flush;
}

// ════════════════════════════════════════════════════════════════════════════
// SCREEN 4 — GAME OVER
// ════════════════════════════════════════════════════════════════════════════
inline void showGameOver(
    const Entity& player,
    int placement,
    int totalPlayers,
    const std::vector<KillEvent>& killLog
) {
    std::cout<<"\033[2J\033[H\n\n";
    bool won=(placement==1);

    if (won){
        std::cout<<BOLD<<YEL
            <<"  ╔══════════════════════════════════╗\n"
            <<"  ║     ★  VICTORY ROYALE  ★        ║\n"
            <<"  ╚══════════════════════════════════╝\n"
            <<RST<<"\n";
    } else {
        std::cout<<BOLD<<RED
            <<"  ╔══════════════════════════════════╗\n"
            <<"  ║          ELIMINATED              ║\n"
            <<"  ╚══════════════════════════════════╝\n"
            <<RST<<"\n";
    }

    std::cout<<"  Operator : "<<BOLD<<WHT<<player.name<<RST<<"\n";
    std::cout<<"  Placement: "<<(won?std::string(YEL):std::string(WHT))
             <<"#"<<placement<<" / "<<totalPlayers<<RST<<"\n";
    std::cout<<"  Kills    : "<<RED<<player.kills<<RST<<"\n";
    std::cout<<"  HP left  : "<<GRN<<player.hp<<"/"<<player.maxHp<<RST<<"\n\n";

    // Meteor quip as closing line
    const CharacterDef* def=findCharacter(player.characterId);
    if (def){
        std::cout<<"  "<<DIM<<"\""<<def->meteorQuip<<"\""<<RST<<"\n\n";
    }

    // Kill log
    if (!killLog.empty()){
        std::cout<<"  "<<DIM<<"─── KILL LOG ───"<<RST<<"\n";
        for (auto& k:killLog)
            std::cout<<"  "<<RED<<k.killerName<<RST<<" ▶ "<<DIM<<k.victimName<<RST
                     <<"  ["<<k.weapon<<"]\n";
        std::cout<<"\n";
    }

    std::cout<<"  "<<DIM<<"[ PRESS ANY KEY ]"<<RST<<std::flush;
    {
        RawMode r;
        while(rawReadKey()<0){}
        rawReadKey();
    }
}

// ── renderFrame — matches original repo call signature ────────────────────────
inline void renderFrame(
    const World& world,
    const std::vector<Entity>& entities,
    const std::string& killFeed,
    const std::string& meteorMsg,
    float /*elapsed*/
) {
    std::vector<KillEvent> empty;
    renderGame(world, entities, empty, killFeed, meteorMsg);
}

} // namespace rd
