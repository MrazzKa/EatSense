import { Animated, Easing } from 'react-native';

export const createSpringAnimation = (
  value: Animated.Value,
  toValue: number,
  config: {
    tension?: number;
    friction?: number;
    useNativeDriver?: boolean;
  } = {}
): Animated.CompositeAnimation => {
  return Animated.spring(value, {
    toValue,
    tension: config.tension || 100,
    friction: config.friction || 8,
    useNativeDriver: config.useNativeDriver ?? true,
  });
};

export const createTimingAnimation = (
  value: Animated.Value,
  toValue: number,
  config: {
    duration?: number;
    easing?: (_value: number) => number;
    useNativeDriver?: boolean;
  } = {}
): Animated.CompositeAnimation => {
  return Animated.timing(value, {
    toValue,
    duration: config.duration || 300,
    easing: config.easing || Easing.out(Easing.quad),
    useNativeDriver: config.useNativeDriver ?? true,
  });
};

export const createSequenceAnimation = (
  animations: Animated.CompositeAnimation[]
): Animated.CompositeAnimation => {
  return Animated.sequence(animations);
};

export const createParallelAnimation = (
  animations: Animated.CompositeAnimation[]
): Animated.CompositeAnimation => {
  return Animated.parallel(animations);
};

export const createStaggerAnimation = (
  animations: Animated.CompositeAnimation[],
  stagger: number = 100
): Animated.CompositeAnimation => {
  const staggeredAnimations = animations.map((animation, index) => {
    return Animated.sequence([
      Animated.delay(index * stagger),
      animation,
    ]);
  });
  
  return Animated.parallel(staggeredAnimations);
};

export const createLoopAnimation = (
  animation: Animated.CompositeAnimation,
  iterations: number = -1
): Animated.CompositeAnimation => {
  return Animated.loop(animation, { iterations });
};

export const createRepeatAnimation = (
  animation: Animated.CompositeAnimation,
  iterations: number = 1
): Animated.CompositeAnimation => {
  return Animated.loop(animation, { iterations });
};
