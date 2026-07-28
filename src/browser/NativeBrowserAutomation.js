/**
 * Native Android Browser Automation (WebView + JavaScript Injection)
 * 
 * This provides deeper browser automation than just opening URLs.
 * It uses Android's WebView capabilities.
 */

import { registerPlugin } from '@capacitor/core';

const BrowserAutomationPlugin = registerPlugin('BrowserAutomationPlugin');

export class NativeBrowserAutomation {
  async navigate(url) {
    try {
      const result = await BrowserAutomationPlugin.navigate({ url });
      return {
        status: 'success',
        url,
        native: true,
        ...result,
      };
    } catch (error) {
      return {
        status: 'error',
        url,
        message: error.message,
      };
    }
  }

  async click(selector) {
    try {
      const result = await BrowserAutomationPlugin.click({ selector });
      return { status: 'success', selector, native: true, ...result };
    } catch (error) {
      return { status: 'error', selector, message: error.message };
    }
  }

  async fill(selector, value) {
    try {
      const result = await BrowserAutomationPlugin.fill({ selector, value });
      return { status: 'success', selector, value, native: true, ...result };
    } catch (error) {
      return { status: 'error', selector, value, message: error.message };
    }
  }

  async extract(selector) {
    try {
      const result = await BrowserAutomationPlugin.extract({ selector });
      return { status: 'success', selector, data: result?.data || [], native: true };
    } catch (error) {
      return { status: 'error', selector, message: error.message };
    }
  }

  async screenshot() {
    try {
      const result = await BrowserAutomationPlugin.screenshot();
      return { status: 'success', native: true, ...result };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

export const nativeBrowserAutomation = new NativeBrowserAutomation();