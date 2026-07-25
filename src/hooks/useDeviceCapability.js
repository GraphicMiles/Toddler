import { useCallback, useEffect, useState } from 'react';
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

  const refresh = useCallback(async () => { const capacity = await getDeviceCapacity(); setDeviceCapability(capacity); return capacity; }, []);
  useEffect(() => { let current = true; getDeviceCapacity().then(capacity => { if (current) setDeviceCapability(capacity); }); return () => { current = false; }; }, []);
  return { deviceCapability, refresh };
}
