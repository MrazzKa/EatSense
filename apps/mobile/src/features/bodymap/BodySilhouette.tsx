import React, { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { BODY_VIEWBOX, bodyPath, severityBand } from './catalog';
import type { Gender } from './catalog';

export interface SilhouettePalette {
  /** Fill of the body itself. Must read as a solid shape against the page. */
  body: string;
  /** The body outline. */
  outline: string;
  /** Fill per severity band, used for the pin. */
  mild: string;
  moderate: string;
  severe: string;
  extreme: string;
  /** Ring behind a pin, so it stays visible over any fill. */
  pinRing: string;
}

/** One mark the user placed: where they tapped, and how bad it is. */
export interface BodyMark {
  id: string;
  zoneId: string;
  /** viewBox coordinates — the exact spot that was tapped. */
  x: number;
  y: number;
  severity: number;
}

interface Props {
  gender: Gender;
  marks: BodyMark[];
  /** Fired with viewBox coordinates. The screen decides what that means. */
  onTapBody: (x: number, y: number) => void;
  palette: SilhouettePalette;
  width: number;
  accessibilityLabel?: string;
}

/**
 * The tappable body silhouette.
 *
 * Presentational: it knows about shapes and touches, and nothing about reports,
 * navigation or translation.
 *
 * Touches are handled by the wrapping View rather than by per-shape `onPress`:
 * the user places a *point*, so the exact coordinate is the answer and there is
 * no shape to attach a handler to. Converting the touch to viewBox space here
 * lets the caller resolve the zone in plain JS instead of hoping SVG hit-testing
 * agrees with the geometry.
 */
function BodySilhouetteBase({
  gender,
  marks,
  onTapBody,
  palette,
  width,
  accessibilityLabel,
}: Props) {
  const height = (width * BODY_VIEWBOX.height) / BODY_VIEWBOX.width;

  const path = useMemo(() => bodyPath(gender), [gender]);

  const handleTouch = useCallback(
    (event: GestureResponderEvent) => {
      const { locationX, locationY } = event.nativeEvent;
      onTapBody(
        (locationX / width) * BODY_VIEWBOX.width,
        (locationY / height) * BODY_VIEWBOX.height,
      );
    },
    [onTapBody, width, height],
  );

  return (
    <View
      style={[styles.wrap, { width, height }]}
      onStartShouldSetResponder={() => true}
      onResponderRelease={handleTouch}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${BODY_VIEWBOX.width} ${BODY_VIEWBOX.height}`}
      >
        <Path d={path} fill={palette.body} stroke={palette.outline} strokeWidth={1.5} />

        <G>
          {marks.map((mark) => (
            <G key={`pin-${mark.id}`}>
              <Circle cx={mark.x} cy={mark.y} r={9} fill={palette.pinRing} />
              <Circle
                cx={mark.x}
                cy={mark.y}
                r={6.5}
                fill={palette[severityBand(mark.severity)]}
                stroke={palette.outline}
                strokeWidth={0.5}
              />
            </G>
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
});

/**
 * Memoised because the parent re-renders on every slider tick while a mark is
 * being described, and redrawing the whole body at 60 Hz is exactly the kind of
 * waste that makes a React Native screen feel like a web page.
 */
export const BodySilhouette = memo(BodySilhouetteBase);
