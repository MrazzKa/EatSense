import React from 'react';
import { Text, Pressable } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GracefulDegradationWrapper } from '../../components/GracefulDegradationWrapper';

describe('GracefulDegradationWrapper', () => {
  it('renders children when no error occurs', () => {
    render(
      <GracefulDegradationWrapper>
        <Text>Test content</Text>
      </GracefulDegradationWrapper>
    );
    expect(screen.getByText('Test content')).toBeTruthy();
  });

  it('renders fallback when error occurs', () => {
    const fallback = <Text>Fallback content</Text>;
    render(
      <GracefulDegradationWrapper fallback={fallback}>
        <Text>Test content</Text>
      </GracefulDegradationWrapper>
    );
    expect(screen.getByText('Fallback content')).toBeTruthy();
  });

  it('renders default fallback when no custom fallback provided', () => {
    render(
      <GracefulDegradationWrapper>
        <Text>Test content</Text>
      </GracefulDegradationWrapper>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('calls onError when error occurs', () => {
    const onError = jest.fn();
    render(
      <GracefulDegradationWrapper onError={onError}>
        <Text>Test content</Text>
      </GracefulDegradationWrapper>
    );
    expect(onError).toHaveBeenCalled();
  });

  it('calls retry when retry button is pressed', () => {
    render(
      <GracefulDegradationWrapper>
        <Text>Test content</Text>
      </GracefulDegradationWrapper>
    );
    
    fireEvent.press(screen.getByText('Try Again'));
    expect(screen.getByText('Test content')).toBeTruthy();
  });
});
