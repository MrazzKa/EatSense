import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AnalysisResults } from '../../components/AnalysisResults';

describe('AnalysisResults', () => {
  const mockResult = {
    items: [
      {
        label: 'Grilled Chicken Breast',
        kcal: 165,
        protein: 31,
        fat: 3.6,
        carbs: 0,
        gramsMean: 100
      }
    ]
  };

  it('renders analysis results correctly', () => {
    render(
      <AnalysisResults
        imageUri="test-image.jpg"
        result={mockResult}
        onClose={() => {}}
        onEdit={() => {}}
        onShare={() => {}}
      />
    );
    
    expect(screen.getByText('Grilled Chicken Breast')).toBeTruthy();
    expect(screen.getByText('165')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    render(
      <AnalysisResults
        imageUri="test-image.jpg"
        result={mockResult}
        onClose={onClose}
        onEdit={() => {}}
        onShare={() => {}}
      />
    );
    
    fireEvent.press(screen.getByTestId('close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when edit button is pressed', () => {
    const onEdit = jest.fn();
    render(
      <AnalysisResults
        imageUri="test-image.jpg"
        result={mockResult}
        onClose={() => {}}
        onEdit={onEdit}
        onShare={() => {}}
      />
    );
    
    fireEvent.press(screen.getByText('Correct'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onShare when share button is pressed', () => {
    const onShare = jest.fn();
    render(
      <AnalysisResults
        imageUri="test-image.jpg"
        result={mockResult}
        onClose={() => {}}
        onEdit={() => {}}
        onShare={onShare}
      />
    );
    
    fireEvent.press(screen.getByText('Share'));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('displays correct nutrition values', () => {
    render(
      <AnalysisResults
        imageUri="test-image.jpg"
        result={mockResult}
        onClose={() => {}}
        onEdit={() => {}}
        onShare={() => {}}
      />
    );
    
    expect(screen.getByText('165')).toBeTruthy(); // Calories
    expect(screen.getByText('31g')).toBeTruthy(); // Protein
    expect(screen.getByText('3.6g')).toBeTruthy(); // Fat
    expect(screen.getByText('0g')).toBeTruthy(); // Carbs
  });

  it('shows health score correctly', () => {
    render(
      <AnalysisResults
        imageUri="test-image.jpg"
        result={mockResult}
        onClose={() => {}}
        onEdit={() => {}}
        onShare={() => {}}
      />
    );
    
    expect(screen.getByText('Health Score')).toBeTruthy();
  });

  it('displays ingredients correctly', () => {
    render(
      <AnalysisResults
        imageUri="test-image.jpg"
        result={mockResult}
        onClose={() => {}}
        onEdit={() => {}}
        onShare={() => {}}
      />
    );
    
    expect(screen.getByText('Ingredients')).toBeTruthy();
    expect(screen.getByText('Grilled Chicken Breast')).toBeTruthy();
  });
});
