import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UsageSummary } from '../../components/UsageSummary';

describe('UsageSummary', () => {
  it('renders usage information correctly', () => {
    render(
      <UsageSummary
        totalAnalyses={5}
        dailyLimit={10}
        remainingAnalyses={5}
      />
    );
    
    expect(screen.getByText('5 / 10 analyses')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('shows correct status when usage is within limits', () => {
    render(
      <UsageSummary
        totalAnalyses={3}
        dailyLimit={10}
        remainingAnalyses={7}
      />
    );
    
    expect(screen.getByText('Usage within limits')).toBeTruthy();
  });

  it('shows warning when approaching limit', () => {
    render(
      <UsageSummary
        totalAnalyses={8}
        dailyLimit={10}
        remainingAnalyses={2}
      />
    );
    
    expect(screen.getByText('Approaching daily limit')).toBeTruthy();
  });

  it('shows error when limit is reached', () => {
    render(
      <UsageSummary
        totalAnalyses={10}
        dailyLimit={10}
        remainingAnalyses={0}
      />
    );
    
    expect(screen.getByText('Daily limit reached')).toBeTruthy();
  });

  it('calls onUpgrade when upgrade button is pressed', () => {
    const onUpgrade = jest.fn();
    render(
      <UsageSummary
        totalAnalyses={8}
        dailyLimit={10}
        remainingAnalyses={2}
        onUpgrade={onUpgrade}
      />
    );
    
    fireEvent.press(screen.getByText('Upgrade for More'));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it('applies correct color for different usage levels', () => {
    render(
      <UsageSummary
        totalAnalyses={8}
        dailyLimit={10}
        remainingAnalyses={2}
      />
    );
    
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill.props.style).toContainEqual(expect.objectContaining({ backgroundColor: '#F39C12' }));
  });
});
