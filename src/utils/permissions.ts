import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    // Use ImagePicker API which works with expo-camera
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

export const requestMediaLibraryPermission = async (): Promise<boolean> => {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting media library permission:', error);
    return false;
  }
};

export const requestImagePickerPermissions = async (): Promise<boolean> => {
  try {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return cameraPermission.status === 'granted' && mediaPermission.status === 'granted';
  } catch (error) {
    console.error('Error requesting image picker permissions:', error);
    return false;
  }
};

export const checkCameraPermission = async (): Promise<boolean> => {
  try {
    // Use ImagePicker API which works with expo-camera
    const { status } = await ImagePicker.getCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return false;
  }
};

export const checkMediaLibraryPermission = async (): Promise<boolean> => {
  try {
    const { status } = await MediaLibrary.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking media library permission:', error);
    return false;
  }
};

export const checkImagePickerPermissions = async (): Promise<boolean> => {
  try {
    const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
    
    return cameraPermission.status === 'granted' && mediaPermission.status === 'granted';
  } catch (error) {
    console.error('Error checking image picker permissions:', error);
    return false;
  }
};