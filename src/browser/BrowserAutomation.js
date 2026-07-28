import { nativeBrowserAutomation } from './NativeBrowserAutomation.js';
import { isExperimentalEnabled } from '../components/ExperimentalFeatures.jsx';
import { isNative } from '../nativeBridge.js';

export class BrowserAutomation {
  async navigate(url) {
    const experimentalEnabled = isExperimentalEnabled('realBrowser');

    if (experimentalEnabled && isNative) {
      return await nativeBrowserAutomation.navigate(url);
    }

    return {
      status: 'simulated',
      url,
      warning: 'Enable "Real Browser Automation" on Android',
    };
  }

  async click(selector) {
    const experimentalEnabled = isExperimentalEnabled('realBrowser');

    if (experimentalEnabled && isNative) {
      return await nativeBrowserAutomation.click(selector);
    }

    return { status: 'simulated', selector };
  }

  async fill(selector, value) {
    const experimentalEnabled = isExperimentalEnabled('realBrowser');

    if (experimentalEnabled && isNative) {
      return await nativeBrowserAutomation.fill(selector, value);
    }

    return { status: 'simulated', selector, value };
  }

  async extract(selector) {
    const experimentalEnabled = isExperimentalEnabled('realBrowser');

    if (experimentalEnabled && isNative) {
      return await nativeBrowserAutomation.extract(selector);
    }

    return { status: 'simulated', selector, data: [] };
  }

  async screenshot() {
    const experimentalEnabled = isExperimentalEnabled('realBrowser');

    if (experimentalEnabled && isNative) {
      return await nativeBrowserAutomation.screenshot();
    }

    return { status: 'simulated' };
  }
}

export const browserAutomation = new BrowserAutomation();