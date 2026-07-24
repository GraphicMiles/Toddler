import assert from 'node:assert/strict';
import { ON_DEVICE_MODELS, assessOnDeviceModel, getCompatibleOnDeviceModels } from '../src/utils/onDeviceCapability.js';
const model = ON_DEVICE_MODELS[0];
assert.equal(assessOnDeviceModel(model, {}).compatible, false);
assert.equal(assessOnDeviceModel(model, { availableRamBytes: 1 * 1024 ** 3, availableStorageBytes: 2 * 1000 ** 3 }).compatible, false);
assert.equal(assessOnDeviceModel(model, { availableRamBytes: 4 * 1024 ** 3, availableStorageBytes: 2 * 1000 ** 3 }).compatible, true);
assert.equal(getCompatibleOnDeviceModels({ availableRamBytes: 4 * 1024 ** 3, availableStorageBytes: 2 * 1000 ** 3 }).length, 2);
console.log('on-device capability tests passed');
