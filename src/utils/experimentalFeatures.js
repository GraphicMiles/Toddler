/**
 * Experimental Features Configuration
 * Shared utility for checking experimental feature flags
 */

const EXPERIMENTAL_KEY = 'forgeai_experimental_features';

export function isExperimentalEnabled(key) {
  try {
    const features = JSON.parse(localStorage.getItem(EXPERIMENTAL_KEY) || '{}');
    return features[key] === true;
  } catch {
    return false;
  }
}

export default isExperimentalEnabled;