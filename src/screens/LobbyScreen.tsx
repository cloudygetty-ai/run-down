import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { useGameStore } from '../services/state';
import { clearBotBrains } from '../services/ai';
import { CHARACTERS } from '../core/characters';

export const LobbyScreen: React.FC = () => {
  const { gameState, startGame, selectCharacter } = useGameStore();
  const [detailId, setDetailId] = useState<string | null>(null);
  const selectedId = gameState.selectedCharacterId;
  const detailChar = CHARACTERS.find((c) => c.id === detailId) ?? null;

  const handleStart = () => {
    clearBotBrains();
    startGame();
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>RUN DOWN</Text>
        <Text style={styles.subtitle}>Choose your operative — then drop in.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {CHARACTERS.map((c) => {
          const active = c.id === selectedId;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.card, active && styles.cardActive]}
              onPress={() => selectCharacter(c.id)}
              onLongPress={() => setDetailId(c.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.cardName, active && styles.cardNameActive]} numberOfLines={1}>
                {c.name}
              </Text>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <View style={styles.abilityTag}>
                <Text style={styles.abilityTagText} numberOfLines={1}>
                  {c.ability.name}
                </Text>
              </View>
              <Text style={styles.passiveSnip} numberOfLines={2}>
                {c.passive.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected character summary bar */}
      {(() => {
        const sel = CHARACTERS.find((c) => c.id === selectedId);
        if (!sel) {
          return null;
        }
        return (
          <View style={styles.summary}>
            <Text style={styles.sumName}>{sel.name}</Text>
            <Text style={styles.sumAbility}>
              {sel.ability.name} —{' '}
              {(sel.ability.cooldownMs / 1000).toFixed(0)}s cd
              {sel.ability.durationMs > 0
                ? ` · ${(sel.ability.durationMs / 1000).toFixed(0)}s`
                : ' · instant'}
            </Text>
            <Text style={styles.sumPassive} numberOfLines={1}>
              {sel.passive.description}
            </Text>
          </View>
        );
      })()}

      <TouchableOpacity style={styles.playBtn} onPress={handleStart}>
        <Text style={styles.playBtnText}>DEPLOY</Text>
      </TouchableOpacity>

      {/* Detail modal on long-press */}
      <Modal visible={detailChar !== null} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setDetailId(null)}
        >
          {detailChar && (
            <View style={styles.modal}>
              <Text style={styles.modalName}>{detailChar.name}</Text>
              <Text style={styles.modalTitle}>{detailChar.title}</Text>
              <Text style={styles.modalLore}>{detailChar.lore}</Text>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>PASSIVE</Text>
              <Text style={styles.modalBody}>{detailChar.passive.description}</Text>
              <Text style={styles.sectionLabel}>
                ABILITY — {detailChar.ability.name}
              </Text>
              <Text style={styles.modalBody}>{detailChar.ability.description}</Text>
              <Text style={styles.modalMeta}>
                {(detailChar.ability.cooldownMs / 1000).toFixed(0)}s cooldown
                {detailChar.ability.durationMs > 0
                  ? ` · ${(detailChar.ability.durationMs / 1000).toFixed(0)}s duration`
                  : ' · instant'}
              </Text>
              <Text style={styles.modalClose}>Tap anywhere to close</Text>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08080f' },
  header: { alignItems: 'center', paddingTop: 28, paddingBottom: 10 },
  title: { fontSize: 34, fontWeight: 'bold', color: '#ffcc00', letterSpacing: 5 },
  subtitle: { fontSize: 12, color: '#555', marginTop: 4, letterSpacing: 1 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 8,
    paddingBottom: 8,
  },
  card: {
    width: 155,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardActive: {
    borderColor: '#ffcc00',
    backgroundColor: 'rgba(255,200,0,0.07)',
  },
  cardName: { fontSize: 12, fontWeight: 'bold', color: '#bbb', marginBottom: 2 },
  cardNameActive: { color: '#ffcc00' },
  cardTitle: { fontSize: 9, color: '#444', marginBottom: 7, letterSpacing: 1 },
  abilityTag: {
    backgroundColor: 'rgba(255,80,0,0.18)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  abilityTagText: { color: '#ff7733', fontSize: 9, fontWeight: 'bold' },
  passiveSnip: { fontSize: 9, color: '#444', lineHeight: 13 },

  summary: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: 'rgba(255,200,0,0.05)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,200,0,0.18)',
  },
  sumName: { fontSize: 13, fontWeight: 'bold', color: '#ffcc00', marginBottom: 3 },
  sumAbility: { fontSize: 11, color: '#cc8800', marginBottom: 2 },
  sumPassive: { fontSize: 10, color: '#555' },

  playBtn: {
    backgroundColor: '#ffcc00',
    borderRadius: 10,
    paddingVertical: 15,
    marginHorizontal: 20,
    marginBottom: 28,
    alignItems: 'center',
  },
  playBtnText: { fontSize: 17, fontWeight: 'bold', color: '#000', letterSpacing: 3 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#101018',
    borderRadius: 14,
    padding: 22,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: 'rgba(255,200,0,0.25)',
  },
  modalName: { fontSize: 18, fontWeight: 'bold', color: '#ffcc00', marginBottom: 2 },
  modalTitle: { fontSize: 10, color: '#666', letterSpacing: 2, marginBottom: 10 },
  modalLore: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 14,
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 12 },
  sectionLabel: {
    fontSize: 9,
    color: '#ff7733',
    letterSpacing: 2,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalBody: { fontSize: 12, color: '#bbb', lineHeight: 18, marginBottom: 5 },
  modalMeta: { fontSize: 10, color: '#555', marginBottom: 12 },
  modalClose: { fontSize: 10, color: '#333', textAlign: 'center' },
});
