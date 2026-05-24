import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileModal } from '../../components/ProfileModal';

describe('ProfileModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText } = render(
      <ProfileModal
        visible={true}
        onClose={mockOnClose}
      />
    );

    expect(getByText('Account')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
    expect(getByText('Personalization')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('About Us')).toBeTruthy();
    expect(getByText('FAQ')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const { getByTestId } = render(
      <ProfileModal
        visible={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('switches between tabs correctly', () => {
    const { getByText } = render(
      <ProfileModal
        visible={true}
        onClose={mockOnClose}
      />
    );

    const personalizationTab = getByText('Personalization');
    fireEvent.press(personalizationTab);

    expect(getByText('Your Plan')).toBeTruthy();
    expect(getByText('Apple Health Sync')).toBeTruthy();
  });
});