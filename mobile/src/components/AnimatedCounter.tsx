import React, { useEffect, useRef, useState } from 'react';
import { Text, Animated, Easing, TextStyle } from 'react-native';

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  decimals?: number;
  textStyle?: TextStyle;
  delay?: number;
  displayFormat?: 'abbreviated' | 'full';
}

export default function AnimatedCounter({
  end,
  duration = 2500,
  suffix = '',
  decimals = 0,
  textStyle,
  delay = 0,
  displayFormat = 'full',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState('0' + suffix);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  const formatValue = (value: number): string => {
    if (decimals > 0) {
      return value.toFixed(decimals);
    }
    
    if (displayFormat === 'abbreviated') {
      // Abbreviated format for K, M, etc.
      if (value >= 1000) {
        return Math.floor(value / 1000) + 'K';
      }
    }
    
    // Full format with no comma separator for cleaner look
    return Math.floor(value).toString();
  };

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // Listen to animated value changes and update display
    const listenerId = animatedValue.addListener(({ value }) => {
      const formatted = formatValue(value);
      setDisplayValue(formatted + suffix);
    });

    // Start animation after delay
    setTimeout(() => {
      Animated.timing(animatedValue, {
        toValue: end,
        duration,
        delay: 0, // We're using setTimeout for initial delay
        easing: Easing.out(Easing.exp), // easeOutExpo
        useNativeDriver: false, // Text animations require JS driver
      }).start(({ finished }) => {
        if (finished) {
          // Ensure final value is exact
          const formatted = formatValue(end);
          setDisplayValue(formatted + suffix);
        }
      });
    }, delay);

    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, [end, duration, suffix, decimals, delay, displayFormat, animatedValue]);

  return <Text style={textStyle}>{displayValue}</Text>;
}
