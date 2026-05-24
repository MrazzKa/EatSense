import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FocusManager } from '../../components/FocusManager';

describe('FocusManager', () => {
  it('renders children correctly', () => {
    render(
      <FocusManager>
        <div>Test content</div>
      </FocusManager>
    );
    expect(screen.getByText('Test content')).toBeTruthy();
  });

  it('calls onFocus when focused', () => {
    const onFocus = jest.fn();
    render(
      <FocusManager onFocus={onFocus}>
        <div>Test content</div>
      </FocusManager>
    );
    
    fireEvent.focus(screen.getByText('Test content').parent);
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('calls onBlur when blurred', () => {
    const onBlur = jest.fn();
    render(
      <FocusManager onBlur={onBlur}>
        <div>Test content</div>
      </FocusManager>
    );
    
    fireEvent.blur(screen.getByText('Test content').parent);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('applies accessibility props correctly', () => {
    render(
      <FocusManager>
        <div>Test content</div>
      </FocusManager>
    );
    
    const wrapper = screen.getByText('Test content').parent;
    expect(wrapper.props.accessible).toBe(true);
  });
});
