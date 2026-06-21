import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LoreService } from '../services/lore';

type Message = { id: string; role: 'user' | 'assistant' | 'system'; text: string };

type Props = {
  apiKey: string | null;
};

// WHY: service instance is created once per mount so conversation history
// persists across messages while the LORE tab remains open.
function useService(apiKey: string | null) {
  const ref = useRef<LoreService | null>(null);
  if (apiKey && ref.current === null) {
    ref.current = new LoreService(apiKey);
  }
  return ref.current;
}

const SEED: Message = {
  id: 'seed',
  role: 'assistant',
  text: 'Helix Intelligence Network — online. I have full dossiers on all 15 operatives and the complete history of the Run Down. What do you want to know?',
};

export const LoreChat: React.FC<Props> = ({ apiKey }) => {
  const service = useService(apiKey);
  const [messages, setMessages] = useState<Message[]>([SEED]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const send = async () => {
    const text = draft.trim();
    if (!text || loading || !service) return;

    const userMsg: Message = { id: String(Date.now()), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
    setLoading(true);

    try {
      const reply = await service.ask(text);
      const botMsg: Message = { id: String(Date.now() + 1), role: 'assistant', text: reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e: unknown) {
      const errText = e instanceof Error ? e.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        { id: 'err_' + Date.now(), role: 'system', text: `[Error: ${errText}]` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!apiKey) {
    return (
      <View style={styles.noKey}>
        <Text style={styles.noKeyIcon}>◈</Text>
        <Text style={styles.noKeyTitle}>HELIX INTEL — OFFLINE</Text>
        <Text style={styles.noKeyBody}>
          Add your Anthropic API key to{'\n'}
          <Text style={styles.noKeyCode}>src/config.ts</Text>
          {'\n\n'}
          <Text style={styles.noKeyDetail}>
            export const ANTHROPIC_API_KEY = 'sk-ant-…';
          </Text>
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={60}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' && styles.bubbleUser,
              item.role === 'system' && styles.bubbleErr,
            ]}
          >
            {item.role === 'assistant' && (
              <Text style={styles.senderLabel}>HELIX INTEL</Text>
            )}
            <Text
              style={[
                styles.bubbleText,
                item.role === 'user' && styles.bubbleTextUser,
                item.role === 'system' && styles.bubbleTextErr,
              ]}
            >
              {item.text}
            </Text>
          </View>
        )}
        ListFooterComponent={
          loading ? (
            <View style={[styles.bubble, styles.loadingBubble]}>
              <Text style={styles.senderLabel}>HELIX INTEL</Text>
              <ActivityIndicator size="small" color="#7788ff" />
            </View>
          ) : null
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about the lore, operatives, or game world…"
          placeholderTextColor="#333"
          onSubmitEditing={send}
          returnKeyType="send"
          editable={!loading}
          multiline={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || loading) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!draft.trim() || loading}
        >
          <Text style={styles.sendBtnText}>›</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
  },
  bubble: {
    backgroundColor: 'rgba(119,136,255,0.08)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(119,136,255,0.15)',
    maxWidth: '92%',
    alignSelf: 'flex-start',
  },
  bubbleUser: {
    backgroundColor: 'rgba(255,204,0,0.07)',
    borderColor: 'rgba(255,204,0,0.15)',
    alignSelf: 'flex-end',
  },
  bubbleErr: {
    backgroundColor: 'rgba(255,60,60,0.07)',
    borderColor: 'rgba(255,60,60,0.15)',
    alignSelf: 'center',
  },
  loadingBubble: {
    paddingVertical: 14,
  },
  senderLabel: {
    fontSize: 8,
    letterSpacing: 2,
    color: '#7788ff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  bubbleText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#ffcc00',
  },
  bubbleTextErr: {
    color: '#ff6666',
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#08080f',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#eee',
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: '#7788ff',
    borderRadius: 8,
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(119,136,255,0.2)',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  noKey: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noKeyIcon: {
    fontSize: 40,
    color: '#7788ff',
    marginBottom: 14,
  },
  noKeyTitle: {
    fontSize: 14,
    letterSpacing: 3,
    fontWeight: 'bold',
    color: '#7788ff',
    marginBottom: 16,
  },
  noKeyBody: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
  noKeyCode: {
    color: '#7788ff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noKeyDetail: {
    color: '#333',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
