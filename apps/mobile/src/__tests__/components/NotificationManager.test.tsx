import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationManager } from '../../components/NotificationManager';

describe('NotificationManager', () => {
  const mockNotifications = [
    {
      id: '1',
      name: 'Test Notification',
      message: 'Test message',
      type: 'info' as const,
      timestamp: new Date()
    },
    {
      id: '2',
      name: 'Error Notification',
      message: 'Error message',
      type: 'error' as const,
      timestamp: new Date()
    }
  ];

  it('renders notifications correctly', () => {
    render(
      <NotificationManager
        notifications={mockNotifications}
        onRemove={() => {}}
      />
    );
    
    expect(screen.getByText('Test Notification')).toBeTruthy();
    expect(screen.getByText('Error Notification')).toBeTruthy();
  });

  it('calls onRemove when notification is dismissed', () => {
    const onRemove = jest.fn();
    render(
      <NotificationManager
        notifications={mockNotifications}
        onRemove={onRemove}
      />
    );
    
    fireEvent.press(screen.getByTestId('dismiss-1'));
    expect(onRemove).toHaveBeenCalledWith('1');
  });

  it('applies correct styles for different notification types', () => {
    render(
      <NotificationManager
        notifications={mockNotifications}
        onRemove={() => {}}
      />
    );
    
    const infoNotification = screen.getByText('Test Notification').parent;
    const errorNotification = screen.getByText('Error Notification').parent;
    
    expect(infoNotification.props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: '#3498DB' })
    );
    expect(errorNotification.props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: '#E74C3C' })
    );
  });

  it('animates notifications correctly', async () => {
    render(
      <NotificationManager
        notifications={mockNotifications}
        onRemove={() => {}}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeTruthy();
    });
  });
});
