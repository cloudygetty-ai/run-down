import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DigitalDrinkToken, OFFER_LABELS, SONG_DURATION_MS } from '../types';
import { timeRemainingMs, progressFraction } from '../services/DigitalDrinkService';

// ------------------------------------------------------------------
// Outgoing — shows token status + melt countdown to the sender.
// ------------------------------------------------------------------

type OutgoingProps = {
  token: DigitalDrinkToken;
};

export const OutgoingTokenPanel: React.FC<OutgoingProps> = ({ token }) => {
  const [remaining, setRemaining] = useState(() => timeRemainingMs(token));
  const [pct, setPct]             = useState(() => progressFraction(token));

  useEffect(() => {
    if (token.status !== 'pending') return;
    const id = setInterval(() => {
      const now = Date.now();
      setRemaining(timeRemainingMs(token, now));
      setPct(progressFraction(token, now));
    }, 1_000);
    return () => clearInterval(id);
  }, [token]);

  const label = OFFER_LABELS[token.offer];

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>TOKEN SENT</Text>
      <Text style={styles.offerLabel}>{label}</Text>

      {token.status === 'pending' && (
        <>
          <View style={styles.timerTrack}>
            <View style={[styles.timerFill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={styles.timerText}>{Math.ceil(remaining / 1_000)}s to accept</Text>
        </>
      )}
      {token.status === 'accepted' && (
        <Text style={styles.accepted}>ACCEPTED</Text>
      )}
      {token.status === 'melted' && (
        <Text style={styles.melted}>TOKEN MELTED</Text>
      )}
    </View>
  );
};

// ------------------------------------------------------------------
// Incoming — gives the recipient accept / decline controls.
// ------------------------------------------------------------------

type IncomingProps = {
  token: DigitalDrinkToken;
  onAccept: () => void;
  onDecline: () => void;
};

export const IncomingTokenPanel: React.FC<IncomingProps> = ({ token, onAccept, onDecline }) => {
  const [remaining, setRemaining] = useState(() => timeRemainingMs(token));
  const [pct, setPct]             = useState(() => progressFraction(token));

  useEffect(() => {
    if (token.status !== 'pending') return;
    const id = setInterval(() => {
      const now = Date.now();
      setRemaining(timeRemainingMs(token, now));
      setPct(progressFraction(token, now));
    }, 1_000);
    return () => clearInterval(id);
  }, [token]);

  if (token.status !== 'pending' || remaining <= 0) return null;

  const label = OFFER_LABELS[token.offer];

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>YOU HAVE AN OFFER</Text>
      <Text style={styles.offerLabel}>{label}</Text>

      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${pct * 100}%` }]} />
      </View>
      <Text style={styles.timerText}>{Math.ceil(remaining / 1_000)}s remaining</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.75}>
          <Text style={styles.acceptText}>ACCEPT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineBtn} onPress={onDecline} activeOpacity={0.75}>
          <Text style={styles.declineText}>DECLINE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ------------------------------------------------------------------
// Shared styles
// ------------------------------------------------------------------

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#0F0A14',
    borderWidth: 1,
    borderColor: '#C0A060',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  panelTitle: {
    color: '#C0A060',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.2,
    marginBottom: 6,
  },
  offerLabel: {
    color: '#E8E0D0',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
  },
  timerTrack: {
    height: 2,
    backgroundColor: '#2A1F2E',
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 5,
  },
  timerFill: {
    height: '100%',
    backgroundColor: '#C0A060',
  },
  timerText: {
    color: '#7B4F8A',
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#C0A060',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  acceptText: {
    color: '#0A0810',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1.2,
  },
  declineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3D2E3A',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  declineText: {
    color: '#7B4F8A',
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  accepted: {
    color: '#4CAF7D',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1.5,
  },
  melted: {
    color: '#4A2530',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 1,
  },
});
