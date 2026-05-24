import { describe, it, expect } from '@jest/globals';
import {
  exhaustiveSwitch,
  exhaustiveCheck,
  assertNever,
  exhaustiveSwitchWithDefault,
} from '../../core/exhaustive-switches';

describe('Exhaustive Switches', () => {
  it('should throw error for exhaustiveSwitch', () => {
    expect(() => {
      exhaustiveSwitch('test' as never);
    }).toThrow('Unhandled case: test');
  });

  it('should throw error for exhaustiveCheck', () => {
    expect(() => {
      exhaustiveCheck('test' as never);
    }).toThrow('Unhandled case: test');
  });

  it('should throw error for assertNever', () => {
    expect(() => {
      assertNever('test' as never);
    }).toThrow('Unhandled case: test');
  });

  it('should return default value for exhaustiveSwitchWithDefault', () => {
    const result = exhaustiveSwitchWithDefault('test' as never, 'default');
    expect(result).toBe('default');
  });

  it('should work with union types', () => {
    type Status = 'pending' | 'completed' | 'failed';
    
    const handleStatus = (status: Status) => {
      switch (status) {
        case 'pending':
          return 'Processing...';
        case 'completed':
          return 'Done!';
        case 'failed':
          return 'Error occurred';
        default:
          return exhaustiveSwitch(status);
      }
    };

    expect(handleStatus('pending')).toBe('Processing...');
    expect(handleStatus('completed')).toBe('Done!');
    expect(handleStatus('failed')).toBe('Error occurred');
  });
});
