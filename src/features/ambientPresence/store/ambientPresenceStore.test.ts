import { useAmbientPresenceStore } from './ambientPresenceStore';
import { PresenceUser } from '../types';

// Suppress Zustand/timer warnings in tests
jest.useFakeTimers();

function makeUser(
  id: string,
  x: number,
  y: number,
  genre: 'hip-hop' | 'techno',
  bpm: number,
  interests: string[] = ['React Native'],
): PresenceUser {
  return {
    id,
    displayHandle: `@${id}`,
    position: { x, y },
    shadowOffset: { x: 0, y: 0 },
    variant: 'standing',
    vibeGenre: genre,
    vibeBpm: bpm,
    currentTrackTitle: null,
    interests,
    isRevealed: false,
  };
}

function reset() {
  useAmbientPresenceStore.setState({
    localUserId: 'local',
    users: [],
    nearbyRadioMatches: [],
    vibeMatchUserId: null,
    outgoingToken: null,
    incomingToken: null,
    activeMysteryClue: null,
    isArMode: false,
  });
}

describe('ambientPresenceStore', () => {
  beforeEach(reset);
  afterEach(() => jest.clearAllTimers());

  // --- users / radio ---

  describe('setUsers', () => {
    it('populates nearbyRadioMatches for users within radius', () => {
      const local = makeUser('local', 0, 0, 'hip-hop', 100);
      const near  = makeUser('near', 100, 0, 'hip-hop', 105);
      const far   = makeUser('far', 5000, 0, 'techno', 140);

      useAmbientPresenceStore.getState().setLocalUserId('local');
      useAmbientPresenceStore.getState().setUsers([local, near, far]);

      const { nearbyRadioMatches } = useAmbientPresenceStore.getState();
      expect(nearbyRadioMatches).toHaveLength(1);
      expect(nearbyRadioMatches[0].userId).toBe('near');
    });

    it('selects a vibeMatchUserId', () => {
      const local = makeUser('local', 0, 0, 'hip-hop', 100);
      const near  = makeUser('near', 50, 0, 'hip-hop', 102);

      useAmbientPresenceStore.getState().setLocalUserId('local');
      useAmbientPresenceStore.getState().setUsers([local, near]);

      expect(useAmbientPresenceStore.getState().vibeMatchUserId).toBe('near');
    });
  });

  // --- _onPulse ---

  describe('_onPulse', () => {
    it('marks all users revealed when pulse activates', () => {
      const users = [
        makeUser('a', 0, 0, 'hip-hop', 100),
        makeUser('b', 50, 50, 'techno', 130),
      ];
      useAmbientPresenceStore.setState({ users });
      useAmbientPresenceStore.getState()._onPulse(true);
      expect(useAmbientPresenceStore.getState().users.every((u) => u.isRevealed)).toBe(true);
    });

    it('unmarks all users when pulse deactivates', () => {
      const users = [makeUser('a', 0, 0, 'hip-hop', 100)];
      useAmbientPresenceStore.setState({ users: users.map((u) => ({ ...u, isRevealed: true })) });
      useAmbientPresenceStore.getState()._onPulse(false);
      expect(useAmbientPresenceStore.getState().users.every((u) => !u.isRevealed)).toBe(true);
    });

    it('updates revealPulse.isActive', () => {
      useAmbientPresenceStore.getState()._onPulse(true);
      expect(useAmbientPresenceStore.getState().revealPulse.isActive).toBe(true);
      useAmbientPresenceStore.getState()._onPulse(false);
      expect(useAmbientPresenceStore.getState().revealPulse.isActive).toBe(false);
    });
  });

  // --- Digital Drink ---

  describe('sendToken', () => {
    it('creates an outgoing pending token', () => {
      useAmbientPresenceStore.getState().sendToken('target', 'bar');
      const { outgoingToken } = useAmbientPresenceStore.getState();
      expect(outgoingToken).not.toBeNull();
      expect(outgoingToken!.status).toBe('pending');
      expect(outgoingToken!.toUserId).toBe('target');
    });
  });

  describe('acceptToken', () => {
    it('resolves incoming token to accepted', () => {
      const { sendToken } = useAmbientPresenceStore.getState();
      sendToken('local', 'walk');
      // Simulate receiving our own outgoing token as incoming
      const { outgoingToken } = useAmbientPresenceStore.getState();
      useAmbientPresenceStore.setState({ incomingToken: outgoingToken });
      useAmbientPresenceStore.getState().acceptToken();
      expect(useAmbientPresenceStore.getState().incomingToken!.status).toBe('accepted');
    });
  });

  describe('declineToken', () => {
    it('resolves incoming token to melted', () => {
      useAmbientPresenceStore.getState().sendToken('local', 'coffee');
      const { outgoingToken } = useAmbientPresenceStore.getState();
      useAmbientPresenceStore.setState({ incomingToken: outgoingToken });
      useAmbientPresenceStore.getState().declineToken();
      expect(useAmbientPresenceStore.getState().incomingToken!.status).toBe('melted');
    });
  });

  describe('tickTokens', () => {
    it('melts an expired outgoing token', () => {
      useAmbientPresenceStore.getState().sendToken('target', 'rooftop');
      const { outgoingToken } = useAmbientPresenceStore.getState();
      // Force expiry
      useAmbientPresenceStore.setState({
        outgoingToken: { ...outgoingToken!, expiresAt: Date.now() - 1 },
      });
      useAmbientPresenceStore.getState().tickTokens();
      expect(useAmbientPresenceStore.getState().outgoingToken!.status).toBe('melted');
    });

    it('does not touch an already-accepted token', () => {
      useAmbientPresenceStore.getState().sendToken('target', 'bar');
      const { outgoingToken } = useAmbientPresenceStore.getState();
      const accepted = { ...outgoingToken!, status: 'accepted' as const, expiresAt: Date.now() - 1 };
      useAmbientPresenceStore.setState({ outgoingToken: accepted });
      useAmbientPresenceStore.getState().tickTokens();
      expect(useAmbientPresenceStore.getState().outgoingToken!.status).toBe('accepted');
    });
  });

  // --- Mystery Box ---

  describe('dropMysteryClue', () => {
    it('sets activeMysteryClue when users with interests exist', () => {
      const users = [
        makeUser('other', 100, 100, 'techno', 130, ['Unreal Engine', 'game dev']),
      ];
      useAmbientPresenceStore.setState({ users });
      useAmbientPresenceStore.getState().dropMysteryClue();
      const { activeMysteryClue } = useAmbientPresenceStore.getState();
      expect(activeMysteryClue).not.toBeNull();
      expect(typeof activeMysteryClue!.text).toBe('string');
    });

    it('does nothing when no eligible users exist', () => {
      useAmbientPresenceStore.setState({ users: [] });
      useAmbientPresenceStore.getState().dropMysteryClue();
      expect(useAmbientPresenceStore.getState().activeMysteryClue).toBeNull();
    });
  });

  // --- AR mode ---

  describe('setArMode', () => {
    it('toggles isArMode', () => {
      expect(useAmbientPresenceStore.getState().isArMode).toBe(false);
      useAmbientPresenceStore.getState().setArMode(true);
      expect(useAmbientPresenceStore.getState().isArMode).toBe(true);
    });
  });
});
