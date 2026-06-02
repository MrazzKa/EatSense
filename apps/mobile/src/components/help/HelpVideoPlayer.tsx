import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { HelpVideoSource } from '../../config/helpVideos';

type Props = {
  source: HelpVideoSource;
  colors: any;
  t: any;
};

/**
 * Renders a demo video for a help topic. When no source is configured yet it
 * shows a friendly placeholder so the written steps still stand on their own.
 */
const HelpVideoPlayer: React.FC<Props> = ({ source, colors, t }) => {
  // Hooks must run unconditionally; pass null when there is no video.
  const player = useVideoPlayer(source ?? null, (p) => {
    if (source) {
      p.loop = true;
      p.muted = true;
    }
  });

  if (!source) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.surfaceMuted || (colors.primary + '10'), borderColor: colors.border || '#E5E7EB' }]}>
        <Ionicons name="play-circle-outline" size={36} color={colors.textTertiary || '#9CA3AF'} />
        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
          {t('help.videoComingSoon', 'Video guide coming soon')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.videoWrap, { borderColor: colors.border || '#E5E7EB' }]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
      />
    </View>
  );
};

const styles = StyleSheet.create({
  videoWrap: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 360,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    alignSelf: 'center',
  },
  video: { width: '100%', height: '100%' },
  placeholder: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { marginTop: 8, fontSize: 13, fontWeight: '500' },
});

export default HelpVideoPlayer;
