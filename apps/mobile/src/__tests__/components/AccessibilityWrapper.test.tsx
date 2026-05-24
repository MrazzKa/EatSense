import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AccessibilityWrapper } from '../../components/AccessibilityWrapper';

describe('AccessibilityWrapper', () => {
  it('renders children correctly', () => {
    render(
      <AccessibilityWrapper>
        <div>Test content</div>
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
        <div>Test content</div>
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
        <div>Test content</div>
      </AccessibilityWrapper>
    );
    
    const wrapper = screen.getByText('Test content').parent;
    expect(wrapper.props.accessible).toBe(true);
  });
});
