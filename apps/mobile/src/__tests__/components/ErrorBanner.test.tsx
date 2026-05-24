import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBanner } from '../../components/ErrorBanner';

describe('ErrorBanner', () => {
  it('renders error message correctly', () => {
    render(<ErrorBanner message="Test error message" />);
    expect(screen.getByText('Test error message')).toBeTruthy();
  });

  it('applies correct error type styles', () => {
    render(<ErrorBanner message="Test error" type="error" />);
    const banner = screen.getByText('Test error').parent;
    expect(banner.props.style).toContainEqual(expect.objectContaining({ backgroundColor: '#E74C3C' }));
  });

  it('applies correct warning type styles', () => {
    render(<ErrorBanner message="Test warning" type="warning" />);
    const banner = screen.getByText('Test warning').parent;
    expect(banner.props.style).toContainEqual(expect.objectContaining({ backgroundColor: '#F39C12' }));
  });

  it('applies correct info type styles', () => {
    render(<ErrorBanner message="Test info" type="info" />);
    const banner = screen.getByText('Test info').parent;
    expect(banner.props.style).toContainEqual(expect.objectContaining({ backgroundColor: '#3498DB' }));
  });

  it('calls onDismiss when dismiss button is pressed', () => {
    const onDismiss = jest.fn();
    render(<ErrorBanner message="Test error" onDismiss={onDismiss} />);
    
    fireEvent.press(screen.getByTestId('dismiss-button'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not show dismiss button when onDismiss is not provided', () => {
    render(<ErrorBanner message="Test error" />);
    expect(screen.queryByTestId('dismiss-button')).toBeNull();
  });

  it('applies accessibility props correctly', () => {
    render(<ErrorBanner message="Test error" />);
    const banner = screen.getByText('Test error').parent;
    expect(banner.props.accessibilityRole).toBe('alert');
  });
});
