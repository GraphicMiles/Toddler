import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const MobileWrapper = ({ children }) => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Configure Status Bar
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#0A0812' });
      
    }
  }, []);

  // Global trigger for haptics on important actions
  const triggerHaptic = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  };

  return (
    <div className={`mobile-wrapper ${Capacitor.isNativePlatform() ? 'is-native' : ''}`}>
      {children}
    </div>
  );
};

export default MobileWrapper;
