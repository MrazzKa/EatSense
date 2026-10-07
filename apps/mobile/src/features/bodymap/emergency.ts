import { Linking } from 'react-native';
import * as Localization from 'expo-localization';
import type { TFunction } from 'i18next';

/**
 * Emergency numbers for the markets the service is run in — Switzerland and
 * Kazakhstan (docs/plans/2026-09-20-pivot-ai-nutritionist-hotline.md, §7) — where
 * 112 is the national emergency number.
 *
 * Keyed on the device region, never on the UI language: a Spanish speaker in
 * Mexico must not be handed a European number. Everywhere else the app does not
 * guess. It tells the person to call emergency services and offers no button,
 * because dialling the wrong number in an emergency is worse than dialling none.
 */
const EMERGENCY_NUMBERS: Readonly<Record<string, string>> = { CH: '112', KZ: '112' };

export function emergencyNumberFor(regionCode?: string | null): string | null {
  return (regionCode && EMERGENCY_NUMBERS[regionCode.toUpperCase()]) || null;
}

export function deviceEmergencyNumber(): string | null {
  try {
    return emergencyNumberFor(Localization.getLocales()[0]?.regionCode);
  } catch {
    return null;
  }
}

export function emergencyCallLabel(t: TFunction, number: string): string {
  return t('bodyMap.emergencyCall', 'Call {{number}}').replace('{{number}}', number);
}

export function callEmergency(number: string): void {
  Linking.openURL(`tel:${number}`).catch(() => {});
}
