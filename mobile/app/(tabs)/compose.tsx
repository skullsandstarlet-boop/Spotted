import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { createSpot } from '@/lib/api';
import { getCurrentCoordinates } from '@/lib/location';
import type { SpotCategory } from '@/types/spotted';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/colors';

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
            placeholderTextColor={colors.textTertiary}
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
                  <Ionicons name={item.icon} size={16} color={selected ? colors.onPrimary : colors.textSecondary} />
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
            placeholderTextColor={colors.textTertiary}
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
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color={colors.onPrimary} />
                <Text style={styles.submitText}>Post anonymously</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="time" size={22} color={colors.primary} />
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
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.accent,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 23,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 30,
    padding: 18,
    gap: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
    marginTop: 4,
  },
  textArea: {
    minHeight: 132,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  counter: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    marginTop: -6,
  },
  input: {
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    color: colors.text,
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
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.textSecondary,
    fontWeight: '900',
    fontSize: 13,
  },
  optionTextSelected: {
    color: colors.onPrimary,
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
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationText: {
    color: colors.textSecondary,
    fontWeight: '900',
  },
  durationTextSelected: {
    color: colors.onPrimary,
  },
  message: {
    color: colors.error,
    fontWeight: '800',
    lineHeight: 20,
  },
  submitButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.primary,
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
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  noteCard: {
    backgroundColor: colors.surface,
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
    color: colors.text,
    fontWeight: '900',
    fontSize: 16,
  },
  noteText: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
