import React from 'react';
import { render } from '@testing-library/react-native';
import { AccessibleProgress } from '../../components/AccessibleProgress';

describe('AccessibleProgress', () => {
  it('renders with correct progress value', () => {
    render(<AccessibleProgress progress={50} />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('applies correct progress bar width', () => {
    render(<AccessibleProgress progress={75} />);
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill.props.style).toContainEqual(expect.objectContaining({ width: '75%' }));
  });

  it('shows percentage when showPercentage is true', () => {
    render(<AccessibleProgress progress={25} showPercentage={true} />);
    expect(screen.getByText('25%')).toBeTruthy();
  });

  it('hides percentage when showPercentage is false', () => {
    render(<AccessibleProgress progress={25} showPercentage={false} />);
    expect(screen.queryByText('25%')).toBeNull();
  });

  it('applies custom color correctly', () => {
    render(<AccessibleProgress progress={50} color="#FF0000" />);
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill.props.style).toContainEqual(expect.objectContaining({ backgroundColor: '#FF0000' }));
  });

  it('applies accessibility props correctly', () => {
    render(<AccessibleProgress progress={50} label="Test Progress" />);
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar.props.accessibilityRole).toBe('progressbar');
    expect(progressBar.props.accessibilityLabel).toBe('Test Progress');
  });
});
