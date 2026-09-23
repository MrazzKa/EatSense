import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BodySilhouette } from '../../features/bodymap/BodySilhouette';
import type { BodyMark, SilhouettePalette } from '../../features/bodymap/BodySilhouette';
import { BODY_VIEWBOX } from '../../features/bodymap/catalog';

/**
 * The silhouette is the one part of the body map a user touches directly, and
 * its failure modes are invisible to a type checker: a tap reported in the wrong
 * coordinate space puts the mark on the wrong body part, and a pin that is not
 * drawn makes the app look like it ignored the tap.
 */

const palette: SilhouettePalette = {
  body: '#FFFFFF',
  outline: '#CBD5F5',
  pinRing: '#FFFFFF',
  mild: '#4ADE80',
  moderate: '#FACC15',
  severe: '#FB923C',
  extreme: '#EF4444',
};

const WIDTH = 200;
const HEIGHT = (WIDTH * BODY_VIEWBOX.height) / BODY_VIEWBOX.width;

const mark = (over: Partial<BodyMark> = {}): BodyMark => ({
  id: 'm1',
  zoneId: 'chest',
  x: 100,
  y: 110,
  severity: 5,
  ...over,
});

function setup(overrides: Partial<React.ComponentProps<typeof BodySilhouette>> = {}) {
  const onTapBody = jest.fn();
  const utils = render(
    <BodySilhouette
      view="front"
      gender="male"
      marks={[]}
      onTapBody={onTapBody}
      palette={palette}
      width={WIDTH}
      accessibilityLabel="body"
      {...overrides}
    />,
  );
  return { ...utils, onTapBody };
}

describe('BodySilhouette', () => {
  it('renders without a mark and is reachable as one labelled control', () => {
    const { getByLabelText } = setup();
    expect(getByLabelText('body')).toBeTruthy();
  });

  it('reports a tap in viewBox coordinates, not screen pixels', () => {
    const { getByLabelText, onTapBody } = setup();
    // Dead centre of the rendered box must come back as the centre of the
    // viewBox, whatever size the body was drawn at.
    fireEvent(getByLabelText('body'), 'responderRelease', {
      nativeEvent: { locationX: WIDTH / 2, locationY: HEIGHT / 2 },
    });
    expect(onTapBody).toHaveBeenCalledTimes(1);
    const [x, y] = onTapBody.mock.calls[0];
    expect(x).toBeCloseTo(BODY_VIEWBOX.width / 2, 5);
    expect(y).toBeCloseTo(BODY_VIEWBOX.height / 2, 5);
  });

  it('scales the tap when the body is drawn smaller', () => {
    const { getByLabelText, onTapBody } = setup({ width: 100 });
    fireEvent(getByLabelText('body'), 'responderRelease', {
      nativeEvent: { locationX: 50, locationY: 110 },
    });
    const [x, y] = onTapBody.mock.calls[0];
    expect(x).toBeCloseTo(100, 5);
    expect(y).toBeCloseTo(220, 5);
  });

  it('draws a pin for every mark', () => {
    const one = setup({ marks: [mark()] });
    const two = setup({ marks: [mark(), mark({ id: 'm2', x: 80, y: 300, zoneId: 'leg_right' })] });
    // Two circles per pin (ring + dot), so the count tracks the marks.
    const circlesOf = (r: ReturnType<typeof setup>) => r.UNSAFE_getAllByType(require('react-native-svg').Circle).length;
    expect(circlesOf(two)).toBe(circlesOf(one) + 2);
  });

  it('draws nothing pin-shaped when there are no marks', () => {
    const { UNSAFE_queryAllByType } = setup();
    expect(UNSAFE_queryAllByType(require('react-native-svg').Circle)).toHaveLength(0);
  });

  it('colours the pin by severity band', () => {
    const { UNSAFE_getAllByType } = setup({ marks: [mark({ severity: 9 })] });
    const circles = UNSAFE_getAllByType(require('react-native-svg').Circle);
    const fills = circles.map((c: any) => c.props.fill);
    expect(fills).toContain(palette.extreme);
  });

  it('switches silhouette when the gender changes', () => {
    const male = setup({ gender: 'male' });
    const female = setup({ gender: 'female' });
    const pathOf = (r: ReturnType<typeof setup>) =>
      r.UNSAFE_getAllByType(require('react-native-svg').Path)[0].props.d;
    expect(pathOf(male)).not.toEqual(pathOf(female));
  });
});
