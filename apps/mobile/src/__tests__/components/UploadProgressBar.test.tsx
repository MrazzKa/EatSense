import React from 'react';
import { render } from '@testing-library/react-native';
import { UploadProgressBar } from '../../components/UploadProgressBar';

describe('UploadProgressBar', () => {
  it('renders with correct progress value', () => {
    render(<UploadProgressBar progress={50} status="uploading" />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('applies correct progress bar width', () => {
    render(<UploadProgressBar progress={75} status="uploading" />);
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill.props.style).toContainEqual(expect.objectContaining({ width: '75%' }));
  });

  it('shows correct status text for uploading', () => {
    render(<UploadProgressBar progress={50} status="uploading" />);
    expect(screen.getByText('Uploading...')).toBeTruthy();
  });

  it('shows correct status text for processing', () => {
    render(<UploadProgressBar progress={50} status="processing" />);
    expect(screen.getByText('Processing...')).toBeTruthy();
  });

  it('shows correct status text for completed', () => {
    render(<UploadProgressBar progress={100} status="completed" />);
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('shows correct status text for error', () => {
    render(<UploadProgressBar progress={50} status="error" />);
    expect(screen.getByText('Error')).toBeTruthy();
  });

  it('calls onComplete when status is completed', () => {
    const onComplete = jest.fn();
    render(<UploadProgressBar progress={100} status="completed" onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('applies correct color for different statuses', () => {
    render(<UploadProgressBar progress={50} status="uploading" />);
    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill.props.style).toContainEqual(expect.objectContaining({ backgroundColor: '#3498DB' }));
  });
});
