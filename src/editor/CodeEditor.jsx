import { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { editorExtension } from './codeFormatting.js';
import './CodeEditor.css';

async function languageForPath(path) {
  const extension = editorExtension(path);
  if (['js', 'jsx', 'mjs', 'cjs'].includes(extension)) return (await import('@codemirror/lang-javascript')).javascript({ jsx: extension === 'jsx' });
  if (['ts', 'tsx'].includes(extension)) return (await import('@codemirror/lang-javascript')).javascript({ jsx: extension === 'tsx', typescript: true });
  if (extension === 'json') return (await import('@codemirror/lang-json')).json();
  if (['css', 'scss', 'less'].includes(extension)) return (await import('@codemirror/lang-css')).css();
  if (['html', 'htm'].includes(extension)) return (await import('@codemirror/lang-html')).html();
  if (extension === 'py') return (await import('@codemirror/lang-python')).python();
  if (['java', 'kt', 'kts'].includes(extension)) return (await import('@codemirror/lang-java')).java();
  if (['c', 'cc', 'cpp', 'cxx', 'h', 'hpp'].includes(extension)) return (await import('@codemirror/lang-cpp')).cpp();
  if (extension === 'php') return (await import('@codemirror/lang-php')).php();
  if (extension === 'rs') return (await import('@codemirror/lang-rust')).rust();
  if (['sql', 'sqlite'].includes(extension)) return (await import('@codemirror/lang-sql')).sql();
  if (extension === 'xml') return (await import('@codemirror/lang-xml')).xml();
  if (['yml', 'yaml'].includes(extension)) return (await import('@codemirror/lang-yaml')).yaml();
  if (['md', 'markdown'].includes(extension)) return (await import('@codemirror/lang-markdown')).markdown();
  return [];
}

export default function CodeEditor({ path, value, onChange, readOnly = false }) {
  const [language, setLanguage] = useState([]);
  useEffect(() => {
    let current = true;
    languageForPath(path)
      .then(extension => { if (current) setLanguage(extension); })
      .catch(() => { if (current) setLanguage([]); });
    return () => { current = false; };
  }, [path]);
  const extensions = useMemo(() => [
    language,
    EditorView.lineWrapping,
    EditorView.theme({
      '&': { backgroundColor: 'var(--bg-inset)', color: 'var(--text-primary)', fontSize: '14px' },
      '.cm-content': { fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Consolas, monospace', lineHeight: '1.65', padding: '14px 0 30vh' },
      '.cm-gutters': { backgroundColor: 'var(--bg-inset)', color: 'var(--text-tertiary)', border: 'none' },
      '.cm-activeLine': { backgroundColor: 'var(--bg-surface-raised)' },
      '.cm-activeLineGutter': { backgroundColor: 'var(--bg-surface-raised)', color: 'var(--accent)' },
      '.cm-selectionBackground': { backgroundColor: 'var(--accent-subtle) !important' },
      '.cm-cursor': { borderLeftColor: 'var(--accent)' },
    }),
  ], [language]);

  return (
    <CodeMirror
      className="forge-code-editor"
      value={value}
      height="100%"
      minHeight="360px"
      theme={oneDark}
      extensions={extensions}
      editable={!readOnly}
      readOnly={readOnly}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        history: true,
        foldGutter: true,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        searchKeymap: true,
        foldKeymap: true,
        completionKeymap: true,
        lintKeymap: true,
      }}
      onChange={onChange}
    />
  );
}
