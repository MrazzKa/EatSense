import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Ellipse, Rect, G } from 'react-native-svg';
import { BODY_VIEWBOX, INERT_SHAPES, severityBand, zonesForView } from './catalog';
import type { BodyView, ZoneShape } from './catalog';

export interface SilhouettePalette {
  /** Fill for a zone nobody has touched. Must read as a solid shape against the
   *  page, otherwise the body is invisible until something is selected. */
  idle: string;
  /** Outline of every zone, selected or not. */
  outline: string;
  /** Fill for parts that are drawn but not selectable. Set it to the page
   *  background so they read as outline-only ghosts — that is what tells a
   *  thumb not to bother tapping them. */
  inert: string;
  /** Outline for those same parts. Deliberately fainter than `outline`: on the
   *  back view the arms are drawn but not selectable, and with one shared
   *  outline they looked exactly like the tappable arms on the front. */
  inertOutline: string;
  /** Fill per severity band. */
  mild: string;
  moderate: string;
  severe: string;
  extreme: string;
  /** Outline of a selected zone. */
  selectedOutline: string;
}

interface Props {
  view: BodyView;
  /** zoneId → severity. Presence means selected; severity picks the colour. */
  selected: Record<string, number>;
  onToggleZone: (zoneId: string) => void;
  /**
   * Full screen-reader label for a zone, including its current severity.
   *
   * It carries the selection state in the text rather than relying on
   * `accessibilityState`, because react-native-svg does not forward that prop
   * across the bridge — a selected zone would otherwise be announced exactly
   * like an untouched one.
   */
  labelFor: (zoneId: string, severity?: number) => string;
  palette: SilhouettePalette;
  width: number;
}

/**
 * The tappable body silhouette.
 *
 * Presentational on purpose: it knows about shapes and touches, and nothing about
 * reports, navigation or translation. Everything it draws comes from the
 * catalogue, so a new zone appears here without this file being edited.
 *
 * The body is built from primitives rather than one traced outline because every
 * zone has to be its own hit target. Tracing a single silhouette path would look
 * marginally better and make selection impossible.
 */
function BodySilhouetteBase({ view, selected, onToggleZone, labelFor, palette, width }: Props) {
  const height = (width * BODY_VIEWBOX.height) / BODY_VIEWBOX.width;

  const fillFor = useCallback(
    (zoneId: string) => {
      const severity = selected[zoneId];
      if (!severity) return palette.idle;
      return palette[severityBand(severity)];
    },
    [selected, palette],
  );

  const renderShape = (
    shape: ZoneShape,
    key: string,
    props: Record<string, unknown>,
  ) => {
    if (shape.kind === 'ellipse') {
      return <Ellipse key={key} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...props} />;
    }
    return (
      <Rect
        key={key}
        x={shape.x}
        y={shape.y}
        width={shape.w}
        height={shape.h}
        rx={shape.rx}
        ry={shape.rx}
        {...props}
      />
    );
  };

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${BODY_VIEWBOX.width} ${BODY_VIEWBOX.height}`}>
        {/* Non-selectable body parts first, so selectable zones sit above them. */}
        <G>
          {INERT_SHAPES[view].map((shape, i) =>
            renderShape(shape, `inert-${i}`, {
              fill: palette.inert,
              stroke: palette.inertOutline,
              strokeWidth: 1,
            }),
          )}
        </G>
        <G>
          {zonesForView(view).map((zone) => {
            const isSelected = !!selected[zone.id];
            return renderShape(zone.shape, zone.id, {
              fill: fillFor(zone.id),
              stroke: isSelected ? palette.selectedOutline : palette.outline,
              strokeWidth: isSelected ? 2.5 : 1,
              onPress: () => onToggleZone(zone.id),
              // react-native-svg needs this for reliable taps on Android.
              delayPressIn: 0,
              // Without these the whole body is one unlabelled blob to VoiceOver
              // and TalkBack, which makes the screen unusable rather than merely
              // awkward.
              accessible: true,
              accessibilityRole: 'button',
              accessibilityLabel: labelFor(zone.id, selected[zone.id]),
            });
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
});

/**
 * Memoised because the parent re-renders on every slider tick while a zone sheet
 * is open, and re-rendering 22 SVG nodes at 60 Hz is exactly the kind of waste
 * that makes a React Native screen feel like a web page.
 */
export const BodySilhouette = memo(BodySilhouetteBase);
