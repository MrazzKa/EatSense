import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLORS = ['#4CAF50', '#FFD700', '#FF6B6B', '#4ECDC4', '#FFA500', '#9C27B0'];
const SHAPES: Array<'circle' | 'square' | 'triangle'> = ['circle', 'square', 'triangle'];

interface ConfettiParticleProps {
  id: number;
  x: number;
  initialY: number;
  color: string;
  size: number;
  shape: 'circle' | 'square' | 'triangle';
  duration: number;
  delay: number;
}

function ConfettiParticle({
  x,
  initialY,
  color,
  size,
  shape,
  duration,
  delay,
}: ConfettiParticleProps) {
  const y = useRef(new Animated.Value(initialY)).current;
  const [initialRotation] = useState(() => Math.random() * 360);
  const rotation = useRef(new Animated.Value(initialRotation)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animations = [
      Animated.delay(delay),
    ];

    Animated.parallel([
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, {
          toValue: SCREEN_HEIGHT + 100,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(rotation, {
          toValue: initialRotation + 360 * (2 + Math.random() * 2),
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(delay + duration * 0.7),
        Animated.timing(opacity, {
          toValue: 0,
          duration: duration * 0.3,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [delay, duration]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const renderShape = () => {
    if (shape === 'circle') {
      return <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />;
    } else if (shape === 'square') {
      return (
        <Path
          d={`M 0,0 L ${size},0 L ${size},${size} L 0,${size} Z`}
          fill={color}
        />
      );
    } else {
      // Triangle
      return (
        <Path
          d={`M ${size / 2},0 L ${size},${size} L 0,${size} Z`}
          fill={color}
        />
      );
    }
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          width: size,
          height: size,
          transform: [
            { translateY: y },
            { rotate: rotateInterpolate },
          ],
          opacity,
        },
      ]}
    >
      <Svg width={size} height={size}>
        {renderShape()}
      </Svg>
    </Animated.View>
  );
}

interface ConfettiCelebrationProps {
  visible: boolean;
  onComplete?: () => void;
  duration?: number;
  particleCount?: number;
}

/**
 * ConfettiCelebration - Confetti animation component
 * Similar to Microsoft Teams celebration animations
 */
export default function ConfettiCelebration({
  visible,
  onComplete,
  duration = 2000,
  particleCount = 50,
}: ConfettiCelebrationProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    initialY: number;
    color: string;
    size: number;
    shape: 'circle' | 'square' | 'triangle';
    duration: number;
    delay: number;
  }>>([]);

  useEffect(() => {
    if (visible) {
      // Generate particles
      const newParticles = Array.from({ length: particleCount }, (_, i) => {
        const particleDuration = duration + (i % 300);
        const delay = (i % 100) * 10; // Stagger particles slightly
        return {
          id: i,
          x: Math.random() * SCREEN_WIDTH,
          initialY: -20 - Math.random() * 20,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 6 + Math.random() * 8,
          shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
          duration: particleDuration,
          delay,
        };
      });

      setParticles(newParticles);

      // Call onComplete after animation
      const timer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, duration + 500);

      return () => {
        clearTimeout(timer);
      };
    } else {
      setParticles([]);
    }
  }, [visible, duration, particleCount, onComplete]);

  if (!visible || particles.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <ConfettiParticle key={particle.id} {...particle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
});
