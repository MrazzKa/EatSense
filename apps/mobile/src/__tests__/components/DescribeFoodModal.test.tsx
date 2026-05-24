import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { DescribeFoodModal } from '../../components/DescribeFoodModal';

describe('DescribeFoodModal', () => {
  const mockOnClose = jest.fn();
  const mockOnAnalyze = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText } = render(
      <DescribeFoodModal
        visible={true}
        onClose={mockOnClose}
        onAnalyze={mockOnAnalyze}
      />
    );

    expect(getByText('Describe Your Food')).toBeTruthy();
    expect(getByText('Tell us what you ate and we\'ll analyze it')).toBeTruthy();
  });

  it('calls onAnalyze when analyze button is pressed with valid input', async () => {
    const { getByPlaceholderText, getByText } = render(
      <DescribeFoodModal
        visible={true}
        onClose={mockOnClose}
        onAnalyze={mockOnAnalyze}
      />
    );

    const textInput = getByPlaceholderText('e.g., Grilled chicken breast with rice and vegetables');
    fireEvent.changeText(textInput, 'Grilled chicken breast');

    const analyzeButton = getByText('Analyze');
    fireEvent.press(analyzeButton);

    await waitFor(() => {
      expect(mockOnAnalyze).toHaveBeenCalledWith('Grilled chicken breast');
    });
  });

  it('does not call onAnalyze when analyze button is pressed with empty input', () => {
    const { getByText } = render(
      <DescribeFoodModal
        visible={true}
        onClose={mockOnClose}
        onAnalyze={mockOnAnalyze}
      />
    );

    const analyzeButton = getByText('Analyze');
    fireEvent.press(analyzeButton);

    expect(mockOnAnalyze).not.toHaveBeenCalled();
  });
});