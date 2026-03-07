import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useChild } from '../context/ChildContext';
import {
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
  TOUCH_TARGET,
  type AppColors,
} from '../constants/theme';
import type { RecordWithTags } from '../types/record';
import { getAllRecords, isDatabaseReady } from '../db';
import { processTextRecord } from '../services/recordPipeline';
import { processOfflineQueue } from '../services/offlineQueue';
import RecordCard from '../components/RecordCard';

interface HomeScreenProps {
  navigation: any;
}

const PAGE_SIZE = 20;
const PEARL_SIZE = 160;
const PULSE_COUNT = 3;

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.lg,
    },
    title: { fontSize: 28, fontWeight: FONT_WEIGHT.bold, color: colors.secondary, letterSpacing: -0.5 },
    subtitle: { fontSize: FONT_SIZE.sm, color: colors.textTertiary, marginTop: 2, letterSpacing: 0.3 },
    headerRight: { flexDirection: 'row', gap: SPACING.sm },
    headerIcon: { padding: SPACING.sm },
    listContent: { paddingTop: SPACING.md, paddingBottom: SPACING.md },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: SPACING.xxl },
    listFooter: { paddingVertical: SPACING.xl, alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyHint: { fontSize: FONT_SIZE.md, color: colors.textTertiary, textAlign: 'center', lineHeight: 24 },
    bottomArea: { alignItems: 'center', paddingBottom: SPACING.lg },
    inputBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface,
      borderTopWidth: 1, borderTopColor: colors.border,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
      width: '100%', marginTop: SPACING.md, gap: SPACING.sm,
    },
    pearlContainer: { alignItems: 'center' },
    pearlWrapper: { width: PEARL_SIZE, height: PEARL_SIZE, alignItems: 'center', justifyContent: 'center' },
    pulseRing: { position: 'absolute', width: PEARL_SIZE, height: PEARL_SIZE, borderRadius: PEARL_SIZE / 2, backgroundColor: colors.secondary },
    pearlButton: {
      width: PEARL_SIZE, height: PEARL_SIZE, borderRadius: PEARL_SIZE / 2,
      backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', ...SHADOW.lg,
    },
    typingInput: { flex: 1, fontSize: FONT_SIZE.md, color: colors.textPrimary, paddingVertical: SPACING.sm },
    sendButton: {
      width: TOUCH_TARGET.min, height: TOUCH_TARGET.min, borderRadius: TOUCH_TARGET.min / 2,
      backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    },
  });
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { children: childList, activeChild, setActiveChild } = useChild();

  const [records, setRecords] = useState<RecordWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const pulseAnims = useRef(
    Array.from({ length: PULSE_COUNT }, () => ({
      scale: new Animated.Value(1),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const loops = pulseAnims.map(({ scale, opacity }, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(i * 600),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1.9, duration: 1800, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(opacity, { toValue: 0.25, duration: 400, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
            ]),
          ]),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach((l) => l.stop());
  }, [pulseAnims]);

  const loadRecords = useCallback(async (reset = false) => {
    try {
      if (!isDatabaseReady()) { setRecords([]); setHasMore(false); return; }
      const offset = reset ? 0 : records.length;
      const filterChildId = activeChild?.id;
      const timeout = new Promise<RecordWithTags[]>((_, reject) => setTimeout(() => reject(new Error('DB query timeout')), 5000));
      const data = await Promise.race([getAllRecords(PAGE_SIZE, offset, filterChildId), timeout]);
      if (reset) { setRecords(data); setShowEmptyState(data.length === 0); }
      else { setRecords((prev) => [...prev, ...data]); }
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      if (reset) { setRecords([]); setShowEmptyState(true); }
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [records.length, activeChild?.id]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadRecords(true);
      processOfflineQueue().then((count) => { if (count > 0) loadRecords(true); }).catch(() => {});
      return () => setShowEmptyState(false);
    }, [])
  );

  const handleRefresh = useCallback(() => { setIsRefreshing(true); loadRecords(true); }, [loadRecords]);
  const handleLoadMore = useCallback(() => { if (!isLoading && hasMore) loadRecords(false); }, [isLoading, hasMore, loadRecords]);
  const handleRecordPress = useCallback((record: RecordWithTags) => { navigation.navigate('RecordDetail', { recordId: record.id }); }, [navigation]);
  const handlePearlPress = useCallback(() => { navigation.navigate('Recording'); }, [navigation]);

  const handleTextSubmit = useCallback(async () => {
    const text = textInput.trim();
    if (!text || isSaving) return;
    setIsSaving(true);
    setTextInput('');
    try { await processTextRecord(text, activeChild?.id); loadRecords(true); }
    catch {}
    finally { setIsSaving(false); }
  }, [textInput, isSaving, loadRecords, activeChild?.id]);

  const renderItem = useCallback(({ item }: { item: RecordWithTags }) => (
    <RecordCard record={item} onPress={() => handleRecordPress(item)} />
  ), [handleRecordPress]);

  const renderFooter = useCallback(() => {
    if (!hasMore || records.length === 0) return null;
    return <View style={styles.listFooter}><ActivityIndicator size="small" color={colors.textTertiary} /></View>;
  }, [hasMore, records.length, styles, colors]);

  const hasRecords = records.length > 0;

  const micIconColor = colors.secondary === '#EAEAEA'
    ? 'rgba(5,22,34,0.35)'
    : 'rgba(255,255,255,0.35)';

  const PearlButton = (
    <View style={styles.pearlWrapper}>
      {pulseAnims.map(({ scale, opacity }, i) => (
        <Animated.View key={i} style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />
      ))}
      <TouchableOpacity onPress={handlePearlPress} activeOpacity={0.85} style={styles.pearlButton}>
        <Ionicons name="mic-outline" size={52} color={micIconColor} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <TouchableOpacity
            onPress={() => {
              if (childList.length < 2) return;
              Alert.alert(
                '아이 전환',
                '기록을 볼 아이를 선택하세요',
                [
                  ...childList.map(c => ({
                    text: (c.id === activeChild?.id ? '✓ ' : '') + c.name,
                    onPress: () => setActiveChild(c.id),
                  })),
                  { text: '취소', style: 'cancel' as const },
                ]
              );
            }}
            activeOpacity={childList.length >= 2 ? 0.7 : 1}
          >
            <Text style={styles.title}>
              {activeChild ? `${activeChild.name}의 바다` : '바다'}
              {childList.length >= 2 ? ' ⌄' : ''}
            </Text>
          </TouchableOpacity>
          <Text style={styles.subtitle}>나의 기록</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Tags')} style={styles.headerIcon}>
            <Ionicons name="pricetags-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerIcon}>
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {!hasRecords && showEmptyState ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyHint}>눌러서 말하거나{'\n'}아래에 타이핑하세요</Text>
          </View>
        ) : (
          <FlatList
            data={records}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={isLoading ? <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View> : null}
            ListFooterComponent={renderFooter}
          />
        )}

        <View style={styles.bottomArea}>
          <View style={styles.pearlContainer}>
            {PearlButton}
          </View>
          <View style={styles.inputBar}>
            <TextInput
              style={styles.typingInput}
              placeholder="기록을 입력하세요..."
              placeholderTextColor={colors.textTertiary}
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={handleTextSubmit}
              returnKeyType="send"
              multiline={false}
              editable={!isSaving}
            />
            <TouchableOpacity
              onPress={handleTextSubmit}
              style={[styles.sendButton, !textInput.trim() && !isSaving && { opacity: 0.35 }]}
              disabled={isSaving || !textInput.trim()}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Ionicons name="send" size={18} color={colors.textOnPrimary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
