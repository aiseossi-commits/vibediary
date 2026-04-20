import React, { useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Modal, FlatList,
  useWindowDimensions, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, BORDER_RADIUS } from '../constants/theme';

interface Props {
  urls: string[];
  thumbnailSize?: number;
}

export default function PhotoGallery({ urls, thumbnailSize = 72 }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (urls.length === 0) return null;

  return (
    <>
      <FlatList
        data={urls}
        horizontal
        keyExtractor={(u, i) => `${u}-${i}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => setViewerIndex(index)}
            activeOpacity={0.8}
            style={[styles.thumb, { width: thumbnailSize, height: thumbnailSize }]}
          >
            <Image
              source={{ uri: item }}
              style={[styles.thumbImg, { borderRadius: BORDER_RADIUS.sm }]}
              contentFit="cover"
            />
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={viewerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerIndex(null)}
        statusBarTranslucent
      >
        <View style={styles.viewerBg}>
          <StatusBar hidden />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setViewerIndex(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {viewerIndex !== null && (
            <Image
              source={{ uri: urls[viewerIndex] }}
              style={{ width: windowWidth, height: windowWidth }}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: SPACING.xs, paddingVertical: SPACING.xs },
  thumb: { borderRadius: BORDER_RADIUS.sm, overflow: 'hidden' },
  thumbImg: { flex: 1 },
  viewerBg: {
    flex: 1, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute', top: 50, right: 20, zIndex: 10,
    padding: SPACING.sm,
  },
});
