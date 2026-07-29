import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

class ElementStub {}
class SVGElementStub extends ElementStub {}

const store = new Map();
const previousGlobals = {
  Element: globalThis.Element,
  HTMLElement: globalThis.HTMLElement,
  SVGElement: globalThis.SVGElement,
  localStorage: globalThis.localStorage,
  navigator: globalThis.navigator,
  window: globalThis.window,
  document: globalThis.document,
  alert: globalThis.alert,
  confirm: globalThis.confirm,
  prompt: globalThis.prompt,
};

Object.defineProperties(globalThis, {
  Element: { value: ElementStub, configurable: true },
  HTMLElement: { value: ElementStub, configurable: true },
  SVGElement: { value: SVGElementStub, configurable: true },
  localStorage: {
    value: {
      getItem: key => store.has(key) ? store.get(key) : null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: key => store.delete(key),
      clear: () => store.clear(),
    },
    configurable: true,
  },
  navigator: {
    value: {
      clipboard: { writeText: async () => {} },
      storage: { estimate: async () => ({ quota: 10_000_000_000 }) },
    },
    configurable: true,
  },
  window: {
    value: {
      confirm: () => true,
      prompt: () => '',
      addEventListener: () => {},
      removeEventListener: () => {},
      location: { reload: () => {} },
    },
    configurable: true,
  },
  document: {
    value: { createElement: () => ({ click: () => {}, style: {}, setAttribute: () => {} }) },
    configurable: true,
  },
  alert: { value: () => {}, configurable: true },
  confirm: { value: () => true, configurable: true },
  prompt: { value: () => '', configurable: true },
});

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const mod = await server.ssrLoadModule('/src/App.jsx');
  const App = mod.default;
  const html = renderToString(React.createElement(App));
  assert.ok(html.length > 1000, 'App should render enough markup for the startup shell');
} finally {
  await server.close();
  for (const [key, value] of Object.entries(previousGlobals)) {
    if (value === undefined) delete globalThis[key];
    else Object.defineProperty(globalThis, key, { value, configurable: true });
  }
}

console.log('startup render tests passed');
