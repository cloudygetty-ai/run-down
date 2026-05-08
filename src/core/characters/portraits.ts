/* eslint-disable @typescript-eslint/no-var-requires */
// Static require() calls so Metro can resolve portrait assets at bundle time.
// Swap any entry to null to fall back to the accent-color placeholder in LobbyScreen.

export const PORTRAITS: Record<string, number | null> = {
  vex: require('../../../assets/portraits/vex.png'),
  brutus: require('../../../assets/portraits/brutus.png'),
  nyra: require('../../../assets/portraits/nyra.png'),
  kade: require('../../../assets/portraits/kade.png'),
  iris: require('../../../assets/portraits/iris.png'),
  rook: require('../../../assets/portraits/rook.png'),
  talon: require('../../../assets/portraits/talon.png'),
  voss: require('../../../assets/portraits/voss.png'),
  sable: require('../../../assets/portraits/sable.png'),
  orin: require('../../../assets/portraits/orin.png'),
  lyric: require('../../../assets/portraits/lyric.png'),
  magnus: require('../../../assets/portraits/magnus.png'),
  eira: require('../../../assets/portraits/eira.png'),
  jax: require('../../../assets/portraits/jax.png'),
  kael: require('../../../assets/portraits/kael.png'),
};
