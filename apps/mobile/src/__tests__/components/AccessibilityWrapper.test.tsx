import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { AccessibilityWrapper } from '../../components/AccessibilityWrapper';

describe('AccessibilityWrapper', () => {
  it('renders children correctly', () => {
    render(
      <AccessibilityWrapper>
        <Text>Test content</Text>
      </AccessibilityWrapper>
    );
    
    expect(screen.getByText('Test content')).toBeTruthy();
  });

  it('applies accessibility props correctly', () => {
    render(
      <AccessibilityWrapper
        accessibilityLabel="Test label"
        accessibilityHint="Test hint"
        accessibilityRole="button"
      >
        <Text>Test content</Text>
      </AccessibilityWrapper>
    );
    
    const wrapper = screen.getByText('Test content').parent;
    expect(wrapper.props.accessibilityLabel).toBe('Test label');
    expect(wrapper.props.accessibilityHint).toBe('Test hint');
    expect(wrapper.props.accessibilityRole).toBe('button');
  });

  it('defaults to accessible when not specified', () => {
    render(
      <AccessibilityWrapper>
        <Text>Test content</Text>
      </AccessibilityWrapper>
    );
    
    const wrapper = screen.getByText('Test content').parent;
    expect(wrapper.props.accessible).toBe(true);
  });
});
