import assert from 'node:assert/strict';
import { ON_DEVICE_MODELS, assessOnDeviceModel, getCompatibleOnDeviceModels } from '../src/utils/onDeviceCapability.js';
const model = ON_DEVICE_MODELS[0];
assert.equal(assessOnDeviceModel(model, {}).compatible, false);
assert.equal(assessOnDeviceModel(model, { ramBytes: 1 * 1024 ** 3, availableRamBytes: 700 * 1024 ** 2, availableStorageBytes: 2 * 1000 ** 3 }).compatible, false);
const capable = { ramBytes: 4 * 1024 ** 3, availableRamBytes: 3 * 1024 ** 3, availableStorageBytes: 3 * 1000 ** 3 };
assert.equal(assessOnDeviceModel(model, capable).compatible, true);
assert.equal(getCompatibleOnDeviceModels(capable).length, 4);
console.log('on-device capability tests passed');
