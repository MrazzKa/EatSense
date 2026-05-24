import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ImagePickerBlock } from '../../components/ImagePickerBlock';

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: false, assets: [{ uri: 'test-image.jpg' }] })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: false, assets: [{ uri: 'test-image.jpg' }] })),
  MediaTypeOptions: { Images: 'Images' }
}));

describe('ImagePickerBlock', () => {
  it('renders placeholder when no image is selected', () => {
    render(<ImagePickerBlock onImageSelected={() => {}} />);
    expect(screen.getByText('Select an image')).toBeTruthy();
  });

  it('renders selected image when image is provided', () => {
    render(
      <ImagePickerBlock
        onImageSelected={() => {}}
        selectedImage="test-image.jpg"
      />
    );
    expect(screen.getByTestId('selected-image')).toBeTruthy();
  });

  it('shows image options when placeholder is pressed', () => {
    render(<ImagePickerBlock onImageSelected={() => {}} />);
    
    fireEvent.press(screen.getByText('Select an image'));
    expect(screen.getByText('Select Image')).toBeTruthy();
  });

  it('calls onImageSelected when camera option is selected', async () => {
    const onImageSelected = jest.fn();
    render(<ImagePickerBlock onImageSelected={onImageSelected} />);
    
    fireEvent.press(screen.getByText('Select an image'));
    fireEvent.press(screen.getByText('Camera'));
    
    await waitFor(() => {
      expect(onImageSelected).toHaveBeenCalledWith('test-image.jpg');
    });
  });

  it('calls onImageSelected when gallery option is selected', async () => {
    const onImageSelected = jest.fn();
    render(<ImagePickerBlock onImageSelected={onImageSelected} />);
    
    fireEvent.press(screen.getByText('Select an image'));
    fireEvent.press(screen.getByText('Gallery'));
    
    await waitFor(() => {
      expect(onImageSelected).toHaveBeenCalledWith('test-image.jpg');
    });
  });

  it('shows change button when image is selected', () => {
    render(
      <ImagePickerBlock
        onImageSelected={() => {}}
        selectedImage="test-image.jpg"
      />
    );
    expect(screen.getByText('Change')).toBeTruthy();
  });

  it('shows loading state during image selection', async () => {
    render(<ImagePickerBlock onImageSelected={() => {}} />);
    
    fireEvent.press(screen.getByText('Select an image'));
    fireEvent.press(screen.getByText('Camera'));
    
    await waitFor(() => {
      expect(screen.getByTestId('loading-overlay')).toBeTruthy();
    });
  });
});
