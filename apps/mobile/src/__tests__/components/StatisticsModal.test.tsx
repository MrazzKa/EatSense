import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StatisticsModal } from '../../components/StatisticsModal';

describe('StatisticsModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText } = render(
      <StatisticsModal
        visible={true}
        onClose={mockOnClose}
      />
    );

    expect(getByText('Your Statistics')).toBeTruthy();
    expect(getByText('Goal Progress')).toBeTruthy();
    expect(getByText('Calories')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const { getByTestId } = render(
      <StatisticsModal
        visible={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays weight information', () => {
    const { getByText } = render(
      <StatisticsModal
        visible={true}
        onClose={mockOnClose}
      />
    );

    expect(getByText('Current Weight')).toBeTruthy();
    expect(getByText('75.2 kg')).toBeTruthy();
    expect(getByText('Target Weight')).toBeTruthy();
    expect(getByText('70.0 kg')).toBeTruthy();
  });

  it('displays calorie information', () => {
    const { getByText } = render(
      <StatisticsModal
        visible={true}
        onClose={mockOnClose}
      />
    );

    expect(getByText('Total')).toBeTruthy();
    expect(getByText('2,450')).toBeTruthy();
    expect(getByText('Daily Average')).toBeTruthy();
    expect(getByText('2,380')).toBeTruthy();
  });
});