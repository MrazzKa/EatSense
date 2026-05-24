import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RuntimeFeatureFlagTester } from '../../components/RuntimeFeatureFlagTester';

describe('RuntimeFeatureFlagTester', () => {
  const mockFlags = [
    {
      key: 'feature1',
      name: 'Feature 1',
      description: 'Test feature 1',
      enabled: false,
      onToggle: jest.fn()
    },
    {
      key: 'feature2',
      name: 'Feature 2',
      description: 'Test feature 2',
      enabled: true,
      onToggle: jest.fn()
    }
  ];

  it('renders feature flags correctly', () => {
    render(
      <RuntimeFeatureFlagTester
        flags={mockFlags}
        onSave={() => {}}
        onReset={() => {}}
      />
    );
    
    expect(screen.getByText('Feature 1')).toBeTruthy();
    expect(screen.getByText('Feature 2')).toBeTruthy();
  });

  it('calls onToggle when switch is toggled', () => {
    render(
      <RuntimeFeatureFlagTester
        flags={mockFlags}
        onSave={() => {}}
        onReset={() => {}}
      />
    );
    
    const switch1 = screen.getByTestId('switch-feature1');
    fireEvent.press(switch1);
    expect(mockFlags[0].onToggle).toHaveBeenCalledWith('feature1', true);
  });

  it('calls onSave when save button is pressed', () => {
    const onSave = jest.fn();
    render(
      <RuntimeFeatureFlagTester
        flags={mockFlags}
        onSave={onSave}
        onReset={() => {}}
      />
    );
    
    fireEvent.press(screen.getByText('Save Changes'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onReset when reset button is pressed', () => {
    const onReset = jest.fn();
    render(
      <RuntimeFeatureFlagTester
        flags={mockFlags}
        onSave={() => {}}
        onReset={onReset}
      />
    );
    
    fireEvent.press(screen.getByText('Reset'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('shows save button only when there are changes', () => {
    render(
      <RuntimeFeatureFlagTester
        flags={mockFlags}
        onSave={() => {}}
        onReset={() => {}}
      />
    );
    
    expect(screen.queryByText('Save Changes')).toBeNull();
  });
});
