import { MODEL_CATALOG } from '../models/catalog.js';
import { assessModelCompatibility } from './deviceCapacity.js';

export const ON_DEVICE_MODELS = MODEL_CATALOG.filter(model => model.android === true);

export function assessOnDeviceModel(model, capacity = {}) {
  return assessModelCompatibility(model, capacity);
}

export function getCompatibleOnDeviceModels(capacity) {
  return ON_DEVICE_MODELS.filter(model => assessOnDeviceModel(model, capacity).compatible);
}
