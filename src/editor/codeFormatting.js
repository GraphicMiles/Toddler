const FORMATTERS = Object.freeze({
  js: 'babel',
  jsx: 'babel',
  mjs: 'babel',
  cjs: 'babel',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  md: 'markdown',
  markdown: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
});

export function editorExtension(path = '') {
  return path.split('.').pop()?.toLowerCase() || '';
}

export function canFormatPath(path) {
  return Boolean(FORMATTERS[editorExtension(path)]);
}

export async function formatSource(path, content) {
  const parser = FORMATTERS[editorExtension(path)];
  if (!parser) throw new Error('Automatic formatting is not available for this file type.');
  const prettier = await import('prettier/standalone');
  const pluginModules = parser === 'babel' || parser === 'json'
    ? [await import('prettier/plugins/babel'), await import('prettier/plugins/estree')]
    : parser === 'typescript'
      ? [await import('prettier/plugins/typescript'), await import('prettier/plugins/estree')]
      : ['css', 'scss', 'less'].includes(parser)
        ? [await import('prettier/plugins/postcss')]
        : parser === 'html'
          ? [await import('prettier/plugins/html')]
          : parser === 'markdown'
            ? [await import('prettier/plugins/markdown')]
            : parser === 'yaml'
              ? [await import('prettier/plugins/yaml')]
              : [];
  const plugins = pluginModules.map(module => module.default || module);
  return prettier.format(String(content ?? ''), {
    parser,
    plugins,
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
  });
}
