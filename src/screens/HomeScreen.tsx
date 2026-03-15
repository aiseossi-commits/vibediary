import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
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
      paddingHorizontal: 24, paddingVertical: 20,
    },
    title: { fontSize: 30, fontWeight: '700' as const, color: colors.textPrimary, letterSpacing: -0.6 },
    subtitle: { fontSize: 13, color: colors.textTertiary, marginTop: 4, letterSpacing: 0.2 },
    headerRight: { flexDirection: 'row', gap: SPACING.sm },
    headerIcon: { padding: SPACING.sm },
    listContent: { paddingTop: 8, paddingBottom: 16, paddingHorizontal: 0 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: SPACING.xxl },
    listFooter: { paddingVertical: SPACING.xl, alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyHint: { fontSize: 15, color: colors.textTertiary, textAlign: 'center', lineHeight: 24 },
    inputBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface,
      borderBottomWidth: 1, borderBottomColor: colors.divider,
      paddingHorizontal: 16, paddingVertical: 6,
      width: '100%', gap: SPACING.sm,
    },
    pearlCenter: { alignItems: 'center', marginTop: 60, marginBottom: 24 },
    pearlWrapper: { width: PEARL_SIZE, height: PEARL_SIZE, alignItems: 'center', justifyContent: 'center' },
    pulseRing: { position: 'absolute', width: PEARL_SIZE, height: PEARL_SIZE, borderRadius: PEARL_SIZE / 2, backgroundColor: colors.primary },
    pearlButton: {
      width: PEARL_SIZE, height: PEARL_SIZE, borderRadius: PEARL_SIZE / 2,
      backgroundColor: colors.micBg, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: colors.micBorder,
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12,
    },
    pearlLabel: { fontSize: 15, fontWeight: '500' as const, color: colors.micLabel, marginTop: 16, opacity: 0.85, letterSpacing: 0.2 },
    typingInput: { flex: 1, fontSize: 15, color: colors.textPrimary, paddingVertical: SPACING.sm },
    sendButton: {
      width: TOUCH_TARGET.min, height: TOUCH_TARGET.min, borderRadius: TOUCH_TARGET.min / 2,
      backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center',
    },
    modalBox: {
      backgroundColor: colors.surface, borderRadius: 20,
      paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xl, width: '75%',
      borderWidth: 1, borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 17, fontWeight: '600' as const, color: colors.textPrimary,
      textAlign: 'center', marginBottom: SPACING.md,
    },
    modalItem: {
      paddingVertical: 14, paddingHorizontal: 16,
      borderRadius: 12, marginBottom: SPACING.xs,
    },
    modalItemActive: { backgroundColor: colors.primaryLight },
    modalItemText: { fontSize: 15, color: colors.textPrimary },
    modalItemTextActive: { fontWeight: '600' as const, color: colors.primary },
    modalCancel: {
      marginTop: 8, paddingVertical: 14, alignItems: 'center',
      borderTopWidth: 1, borderTopColor: colors.divider,
    },
    modalCancelText: { fontSize: 15, color: colors.textTertiary },
  });
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { children: childList, activeChild, setActiveChild } = useChild();

  const [records, setRecords] = useState<RecordWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [childModalVisible, setChildModalVisible] = useState(false);

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
              Animated.timing(opacity, { toValue: 0.08, duration: 400, useNativeDriver: true }),
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

  const activeChildIdRef = useRef(activeChild?.id);
  useEffect(() => { activeChildIdRef.current = activeChild?.id; }, [activeChild?.id]);

  const loadRecords = useCallback(async (reset = false) => {
    try {
      if (!isDatabaseReady()) { setRecords([]); setHasMore(false); return; }
      const offset = reset ? 0 : records.length;
      const filterChildId = activeChildIdRef.current;
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
  }, [records.length]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadRecords(true);
      processOfflineQueue().then(() => loadRecords(true)).catch(() => {});
      return () => setShowEmptyState(false);
    }, [loadRecords])
  );

  useEffect(() => { loadRecords(true); }, [activeChild?.id]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadRecords(true);
    processOfflineQueue().then(() => loadRecords(true)).catch(() => {});
  }, [loadRecords]);
  const handleLoadMore = useCallback(() => { if (!isLoading && hasMore) loadRecords(false); }, [isLoading, hasMore, loadRecords]);
  const handleRecordPress = useCallback((record: RecordWithTags) => { navigation.navigate('RecordDetail', { recordId: record.id }); }, [navigation]);
  const handlePearlPress = useCallback(() => { navigation.navigate('Recording'); }, [navigation]);

  const handleTextSubmit = useCallback(async () => {
    const text = textInput.trim();
    if (!text || isSaving) return;
    setIsSaving(true);
    setTextInput('');
    try {
      await processTextRecord(text, activeChild?.id);
      loadRecords(true);
      processOfflineQueue().then(() => loadRecords(true)).catch(() => {});
    }
    catch (e) { Alert.alert('저장 실패', '기록 저장 중 오류가 발생했습니다.'); console.error('텍스트 저장 오류:', e); }
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

  const micIconColor = colors.micIcon;

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
      <Modal visible={childModalVisible} transparent animationType="fade" onRequestClose={() => setChildModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setChildModalVisible(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>바다 전환</Text>
            {childList.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.modalItem, c.id === activeChild?.id && styles.modalItemActive]}
                onPress={() => { setActiveChild(c.id); setChildModalVisible(false); }}
              >
                <Text style={[styles.modalItemText, c.id === activeChild?.id && styles.modalItemTextActive]}>
                  {c.id === activeChild?.id ? '✓ ' : ''}{c.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setChildModalVisible(false)}>
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.header}>
        <View>
          <TouchableOpacity
            onPress={() => {
              if (childList.length < 2) return;
              setChildModalVisible(true);
            }}
            activeOpacity={childList.length >= 2 ? 0.7 : 1}
          >
            <Text style={styles.title}>
              {activeChild ? `${activeChild.name}의 ${isDark ? '밤바다' : '바다'}` : (isDark ? '밤바다' : '바다')}
              {childList.length >= 2 ? ' ⌄' : ''}
            </Text>
          </TouchableOpacity>
          <Text style={styles.subtitle}>작은 기록이 큰 추억이 됩니다</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerIcon}>
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Tags')} style={styles.headerIcon}>
            <Ionicons name="pricetags-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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

        <View style={styles.pearlCenter}>
          {PearlButton}
          <Text style={styles.pearlLabel}>지금 말하기</Text>
        </View>

        {!hasRecords && showEmptyState ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyHint}>마이크를 눌러서 말하거나,{'\n'}기록창에 타이핑해서 입력하세요</Text>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
