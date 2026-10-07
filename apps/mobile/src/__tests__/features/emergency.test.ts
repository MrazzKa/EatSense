import * as Localization from 'expo-localization';
import { deviceEmergencyNumber, emergencyNumberFor } from '../../features/bodymap/emergency';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const getLocales = Localization.getLocales as jest.Mock;

describe('emergency number', () => {
  it('offers 112 in the markets the service runs in', () => {
    expect(emergencyNumberFor('CH')).toBe('112');
    expect(emergencyNumberFor('kz')).toBe('112');
  });

  it('offers nothing it cannot vouch for, rather than a wrong number', () => {
    expect(emergencyNumberFor('US')).toBeNull();
    expect(emergencyNumberFor('MX')).toBeNull();
    expect(emergencyNumberFor(undefined)).toBeNull();
    expect(emergencyNumberFor('')).toBeNull();
  });

  it('follows the device region, not the interface language', () => {
    getLocales.mockReturnValue([{ languageCode: 'es', regionCode: 'MX' }]);
    expect(deviceEmergencyNumber()).toBeNull();

    getLocales.mockReturnValue([{ languageCode: 'ru', regionCode: 'KZ' }]);
    expect(deviceEmergencyNumber()).toBe('112');
  });

  it('falls back to no number when the region cannot be read', () => {
    getLocales.mockImplementation(() => {
      throw new Error('native module missing');
    });
    expect(deviceEmergencyNumber()).toBeNull();
  });
});
