import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccessibleButton } from '../../components/AccessibleButton';

describe('AccessibleButton', () => {
  it('renders with correct title', () => {
    render(<AccessibleButton title="Test Button" onPress={() => {}} />);
    expect(screen.getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<AccessibleButton title="Test Button" onPress={onPress} />);
    
    fireEvent.press(screen.getByText('Test Button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies correct variant styles', () => {
    render(<AccessibleButton title="Test Button" onPress={() => {}} variant="primary" />);
    const button = screen.getByText('Test Button').parent;
    expect(button.props.style).toContainEqual(expect.objectContaining({ backgroundColor: '#3498DB' }));
  });

  it('applies correct size styles', () => {
    render(<AccessibleButton title="Test Button" onPress={() => {}} size="large" />);
    const button = screen.getByText('Test Button').parent;
    expect(button.props.style).toContainEqual(expect.objectContaining({ paddingHorizontal: 20 }));
  });

  it('disables button when disabled prop is true', () => {
    render(<AccessibleButton title="Test Button" onPress={() => {}} disabled={true} />);
    const button = screen.getByText('Test Button').parent;
    expect(button.props.disabled).toBe(true);
  });

  it('applies accessibility props correctly', () => {
    render(<AccessibleButton title="Test Button" onPress={() => {}} />);
    const button = screen.getByText('Test Button').parent;
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Test Button');
  });
});
