import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

const MobileWrapper = ({ children }) => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Configure Status Bar
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#14130F' });
      
    }
  }, []);


  return (
    <div className={`mobile-wrapper ${Capacitor.isNativePlatform() ? 'is-native' : ''}`}>
      {children}
    </div>
  );
};

export default MobileWrapper;
