import { useEffect, useState } from 'react';
import { getDeviceCapacity } from '../nativeBridge';

const INITIAL_CAPABILITY = {
  ramBytes: null,
  availableRamBytes: null,
  storageBytes: null,
  availableStorageBytes: null,
  ram: 4,
  storageScope: 'unknown',
  platform: 'unknown',
};

/**
 * Retrieves capacity asynchronously so native measurements update the UI as
 * soon as Capacitor is ready, without rendering a misleading hard-coded size.
 */
export default function useDeviceCapability() {
  const [deviceCapability, setDeviceCapability] = useState(INITIAL_CAPABILITY);

  useEffect(() => {
    let isCurrent = true;

    getDeviceCapacity().then((capacity) => {
      if (isCurrent) setDeviceCapability(capacity);
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  return deviceCapability;
}
