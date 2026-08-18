import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { createSpot } from '@/lib/api';
import { getCurrentCoordinates } from '@/lib/location';
import type { SpotCategory } from '@/types/spotted';
import { Text } from '@/components/ui/Text';

const CATEGORIES: { value: SpotCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'general', label: 'General', icon: 'eye' },
  { value: 'pets', label: 'Pets', icon: 'paw' },
  { value: 'free', label: 'Free', icon: 'gift' },
  { value: 'food', label: 'Food', icon: 'fast-food' },
  { value: 'traffic', label: 'Traffic', icon: 'car' },
  { value: 'safety', label: 'Safety', icon: 'shield-checkmark' },
  { value: 'events', label: 'Events', icon: 'calendar' },
];

const DURATIONS = [1, 3, 6, 12, 24];

export default function ComposeScreen() {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<SpotCategory>('general');
  const [locationHint, setLocationHint] = useState('');
  const [durationHours, setDurationHours] = useState(6);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = body.trim().length >= 8 && body.trim().length <= 240 && !submitting;

  const submitSpot = async () => {
    if (!canSubmit) {
      setMessage('Add at least 8 characters so neighbors know what you spotted.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const location = await getCurrentCoordinates();
      await createSpot({
        body: body.trim(),
        category,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        location_hint: locationHint.trim() || null,
        duration_hours: durationHours,
      });
      setBody('');
      setLocationHint('');
      setCategory('general');
      setDurationHours(6);
      router.replace('/(tabs)');
    } catch {
      setMessage('Your spot could not be posted right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.kicker}>Anonymous by default</Text>
          <Text style={styles.title}>Spot something useful nearby</Text>
          <Text style={styles.subtitle}>Share quick, live neighborhood signals. Posts disappear automatically.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>What did you spot?</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Spotted: loose dog near the park..."
            placeholderTextColor="#B5A08B"
            multiline
            maxLength={240}
            style={styles.textArea}
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{body.trim().length}/240</Text>

          <Text style={styles.label}>Category</Text>
          <View style={styles.optionGrid}>
            {CATEGORIES.map((item) => {
              const selected = item.value === category;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setCategory(item.value)}
                  style={[styles.optionChip, selected && styles.optionChipSelected]}
                >
                  <Ionicons name={item.icon} size={16} color={selected ? '#FFFFFF' : '#8A7A68'} />
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Location hint</Text>
          <TextInput
            value={locationHint}
            onChangeText={setLocationHint}
            placeholder="Near Oak & 3rd, by the playground..."
            placeholderTextColor="#B5A08B"
            maxLength={120}
            style={styles.input}
          />

          <Text style={styles.label}>Disappear after</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map((hours) => {
              const selected = hours === durationHours;
              return (
                <Pressable
                  key={hours}
                  onPress={() => setDurationHours(hours)}
                  style={[styles.durationChip, selected && styles.durationChipSelected]}
                >
                  <Text style={[styles.durationText, selected && styles.durationTextSelected]}>{hours}h</Text>
                </Pressable>
              );
            })}
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable onPress={submitSpot} disabled={!canSubmit} style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>Post anonymously</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="time" size={22} color="#F97316" />
          <View style={styles.noteCopy}>
            <Text style={styles.noteTitle}>Built for now, not forever</Text>
            <Text style={styles.noteText}>Every sighting expires in 24 hours or less, keeping the feed fresh and local.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: '#FFF8EF',
  },
  screen: {
    flex: 1,
    backgroundColor: '#FFF8EF',
  },
  content: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 34,
    gap: 18,
  },
  header: {
    gap: 9,
  },
  kicker: {
    color: '#F97316',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#1F1308',
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '900',
  },
  subtitle: {
    color: '#745F49',
    fontSize: 16,
    lineHeight: 23,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 18,
    gap: 13,
    borderWidth: 1,
    borderColor: '#F2E7D8',
  },
  label: {
    color: '#1F1308',
    fontWeight: '900',
    fontSize: 15,
    marginTop: 4,
  },
  textArea: {
    minHeight: 132,
    borderRadius: 22,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#F2E7D8',
    padding: 16,
    color: '#25170C',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  counter: {
    color: '#9B8975',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    marginTop: -6,
  },
  input: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#F2E7D8',
    paddingHorizontal: 15,
    color: '#25170C',
    fontSize: 15,
    fontWeight: '700',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#F2E7D8',
  },
  optionChipSelected: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  optionText: {
    color: '#6B5B4A',
    fontWeight: '900',
    fontSize: 13,
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  durationChip: {
    width: 54,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#F2E7D8',
  },
  durationChipSelected: {
    backgroundColor: '#1F1308',
    borderColor: '#1F1308',
  },
  durationText: {
    color: '#6B5B4A',
    fontWeight: '900',
  },
  durationTextSelected: {
    color: '#FFFFFF',
  },
  message: {
    color: '#BE123C',
    fontWeight: '800',
    lineHeight: 20,
  },
  submitButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  noteCard: {
    backgroundColor: '#1F1308',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    gap: 12,
  },
  noteCopy: {
    flex: 1,
    gap: 4,
  },
  noteTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  noteText: {
    color: '#F7D9BC',
    lineHeight: 20,
  },
});
