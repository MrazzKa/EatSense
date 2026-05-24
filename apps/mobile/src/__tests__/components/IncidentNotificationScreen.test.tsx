import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { IncidentNotificationScreen } from '../../components/IncidentNotificationScreen';

describe('IncidentNotificationScreen', () => {
  it('renders incident details correctly', () => {
    render(<IncidentNotificationScreen onClose={() => {}} onReport={() => {}} />);
    
    expect(screen.getByText('Security Incident Detected')).toBeTruthy();
    expect(screen.getByText('We\'ve detected unusual activity in your account.')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    render(<IncidentNotificationScreen onClose={onClose} onReport={() => {}} />);
    
    fireEvent.press(screen.getByTestId('close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onReport when report button is pressed', () => {
    const onReport = jest.fn();
    render(<IncidentNotificationScreen onClose={() => {}} onReport={onReport} />);
    
    fireEvent.press(screen.getByText('Report Incident'));
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when contact support button is pressed', () => {
    const onClose = jest.fn();
    render(<IncidentNotificationScreen onClose={onClose} onReport={() => {}} />);
    
    fireEvent.press(screen.getByText('Contact Support'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays current timestamp in incident details', () => {
    render(<IncidentNotificationScreen onClose={() => {}} onReport={() => {}} />);
    
    const timestamp = new Date().toLocaleString();
    expect(screen.getByText(timestamp)).toBeTruthy();
  });
});
