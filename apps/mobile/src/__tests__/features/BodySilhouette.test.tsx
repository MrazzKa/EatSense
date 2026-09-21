import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BodySilhouette } from '../../features/bodymap/BodySilhouette';
import type { SilhouettePalette } from '../../features/bodymap/BodySilhouette';
import { zonesForView } from '../../features/bodymap/catalog';

/**
 * The silhouette is the one part of the body map a user touches directly, and
 * the failure modes are invisible to a type checker: a zone that renders but
 * cannot be tapped, a zone missing from one of the two views, a selected zone
 * that never changes colour. Hence a render test rather than more unit tests.
 */

const palette: SilhouettePalette = {
  idle: '#FFFFFF',
  outline: '#CBD5F5',
  inert: '#F4F5F7',
  inertOutline: '#E2E8F0',
  selectedOutline: '#1F2937',
  mild: '#4ADE80',
  moderate: '#FACC15',
  severe: '#FB923C',
  extreme: '#EF4444',
};

function setup(overrides: Partial<React.ComponentProps<typeof BodySilhouette>> = {}) {
  const onToggleZone = jest.fn();
  const utils = render(
    <BodySilhouette
      view="front"
      selected={{}}
      onToggleZone={onToggleZone}
      labelFor={(zoneId, severity) => (severity ? `zone:${zoneId}:${severity}` : `zone:${zoneId}`)}
      palette={palette}
      width={240}
      {...overrides}
    />,
  );
  return { ...utils, onToggleZone };
}

describe('BodySilhouette', () => {
  it('renders every front zone as its own labelled target', () => {
    const { getByLabelText } = setup();
    for (const zone of zonesForView('front')) {
      expect(getByLabelText(`zone:${zone.id}`)).toBeTruthy();
    }
  });

  it('renders every back zone when the view flips', () => {
    const { getByLabelText, queryByLabelText } = setup({ view: 'back' });
    for (const zone of zonesForView('back')) {
      expect(getByLabelText(`zone:${zone.id}`)).toBeTruthy();
    }
    // Front-only zones must not linger behind the back view.
    expect(queryByLabelText('zone:chest')).toBeNull();
  });

  it('reports the tapped zone to its parent', () => {
    const { getByLabelText, onToggleZone } = setup();
    fireEvent.press(getByLabelText('zone:abdomen_epigastrium'));
    expect(onToggleZone).toHaveBeenCalledWith('abdomen_epigastrium');
  });

  it('announces the severity of a selected zone to the screen reader', () => {
    // react-native-svg drops accessibilityState, so the state has to be audible
    // in the label itself — this asserts that contract, not an implementation.
    const { getByLabelText, queryByLabelText } = setup({ selected: { chest: 7 } });
    expect(getByLabelText('zone:chest:7')).toBeTruthy();
    expect(queryByLabelText('zone:chest')).toBeNull();
    expect(getByLabelText('zone:head')).toBeTruthy();
  });

  it('colours a zone by severity band, not merely by being selected', () => {
    // head 2 and neck 3 are both "mild", chest 9 is "extreme": same band must
    // mean same fill, different band must not.
    const { getByLabelText } = setup({ selected: { head: 2, neck: 3, chest: 9 } });
    const fillOf = (label: string) => getByLabelText(label).props.fill;
    // react-native-svg normalises colours into its own objects, so compare
    // rendered fills with each other rather than with the hex strings.
    expect(fillOf('zone:head:2')).toEqual(fillOf('zone:neck:3'));
    expect(fillOf('zone:head:2')).not.toEqual(fillOf('zone:chest:9'));
    expect(fillOf('zone:head:2')).not.toEqual(fillOf('zone:pelvis'));
  });
});
