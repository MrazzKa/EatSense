import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BottomSheet } from '../../components/BottomSheet';

describe('BottomSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnCameraPress = jest.fn();
  const mockOnGalleryPress = jest.fn();
  const mockOnDescribePress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText } = render(
      <BottomSheet
        visible={true}
        onClose={mockOnClose}
        onCameraPress={mockOnCameraPress}
        onGalleryPress={mockOnGalleryPress}
        onDescribePress={mockOnDescribePress}
      />
    );

    expect(getByText('Add Food')).toBeTruthy();
    expect(getByText('Camera')).toBeTruthy();
    expect(getByText('Gallery')).toBeTruthy();
    expect(getByText('Describe Food')).toBeTruthy();
  });

  it('calls onCameraPress when camera option is pressed', () => {
    const { getByText } = render(
      <BottomSheet
        visible={true}
        onClose={mockOnClose}
        onCameraPress={mockOnCameraPress}
        onGalleryPress={mockOnGalleryPress}
        onDescribePress={mockOnDescribePress}
      />
    );

    const cameraOption = getByText('Camera');
    fireEvent.press(cameraOption);

    expect(mockOnCameraPress).toHaveBeenCalled();
  });

  it('calls onGalleryPress when gallery option is pressed', () => {
    const { getByText } = render(
      <BottomSheet
        visible={true}
        onClose={mockOnClose}
        onCameraPress={mockOnCameraPress}
        onGalleryPress={mockOnGalleryPress}
        onDescribePress={mockOnDescribePress}
      />
    );

    const galleryOption = getByText('Gallery');
    fireEvent.press(galleryOption);

    expect(mockOnGalleryPress).toHaveBeenCalled();
  });

  it('calls onDescribePress when describe option is pressed', () => {
    const { getByText } = render(
      <BottomSheet
        visible={true}
        onClose={mockOnClose}
        onCameraPress={mockOnCameraPress}
        onGalleryPress={mockOnGalleryPress}
        onDescribePress={mockOnDescribePress}
      />
    );

    const describeOption = getByText('Describe Food');
    fireEvent.press(describeOption);

    expect(mockOnDescribePress).toHaveBeenCalled();
  });
});