import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GracefulDegradationWrapper } from '../../components/GracefulDegradationWrapper';

describe('GracefulDegradationWrapper', () => {
  it('renders children when no error occurs', () => {
    render(
      <GracefulDegradationWrapper>
        <div>Test content</div>
      </GracefulDegradationWrapper>
    );
    expect(screen.getByText('Test content')).toBeTruthy();
  });

  it('renders fallback when error occurs', () => {
    const fallback = <div>Fallback content</div>;
    render(
      <GracefulDegradationWrapper fallback={fallback}>
        <div>Test content</div>
      </GracefulDegradationWrapper>
    );
    expect(screen.getByText('Fallback content')).toBeTruthy();
  });

  it('renders default fallback when no custom fallback provided', () => {
    render(
      <GracefulDegradationWrapper>
        <div>Test content</div>
      </GracefulDegradationWrapper>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('calls onError when error occurs', () => {
    const onError = jest.fn();
    render(
      <GracefulDegradationWrapper onError={onError}>
        <div>Test content</div>
      </GracefulDegradationWrapper>
    );
    expect(onError).toHaveBeenCalled();
  });

  it('calls retry when retry button is pressed', () => {
    render(
      <GracefulDegradationWrapper>
        <div>Test content</div>
      </GracefulDegradationWrapper>
    );
    
    fireEvent.press(screen.getByText('Try Again'));
    expect(screen.getByText('Test content')).toBeTruthy();
  });
});
