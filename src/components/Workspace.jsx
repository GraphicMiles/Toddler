import { lazy, Suspense, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, FolderOpen, ChevronRight, X, FileText, Database,
  Pencil, Trash2, FilePlus, FolderPlus, Save, ArrowLeft, RotateCcw, AlignLeft,
  Plus, MoreVertical, RefreshCw, Check, File, FileCode, FileJson, FileImage, FileArchive, Brain,
} from 'lucide-react';
import { getFileIconInfo, buildFileIndex, searchFiles } from '../utils/fileIndex';
import { canFormatPath, formatSource } from '../editor/codeFormatting.js';
import './Workspace.css';

const CodeEditor = lazy(() => import('../editor/CodeEditor.jsx'));
const joinWorkspacePath = (parent, name) => parent ? `${parent}/${name}` : name;

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']);
const ARCHIVE_EXTENSIONS = new Set(['apk', 'aab', 'jar', 'aar', 'zip', 'gz', 'tar']);
const DATA_EXTENSIONS = new Set(['json', 'yaml', 'yml', 'toml', 'ini', 'conf']);
const DOC_EXTENSIONS = new Set(['md', 'txt', 'text', 'log']);

const isModelFileNode = (node) => node?.type === 'file' && (node.name || '').toLowerCase().endsWith('.gguf');

/* Real file-type icons (VS Code convention), tinted with the catalog color for the type */
function FileTypeIcon({ name }) {
  const info = getFileIconInfo(name);
  const ext = (name || '').split('.').pop()?.toLowerCase();
  let Icon = File;
  if (ext === 'gguf') Icon = Brain;
  else if (IMAGE_EXTENSIONS.has(ext)) Icon = FileImage;
  else if (ARCHIVE_EXTENSIONS.has(ext)) Icon = FileArchive;
  else if (DATA_EXTENSIONS.has(ext)) Icon = FileJson;
  else if (DOC_EXTENSIONS.has(ext)) Icon = FileText;
  else if (info.label !== '?') Icon = FileCode;
  return <Icon size={15} className="file-icon" style={{ color: info.color }} />;
}

/* ── File tree node ── */
function FileNode({ node, depth = 0, selectedPath, onSelect, onContextMenu }) {
  const [isOpen, setIsOpen] = useState(node.open || depth === 0);
  const isFolder = node.type === 'folder';
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (isFolder) setIsOpen(!isOpen);
    onSelect?.(node.path, node);
  };

  return (
    <div className="file-node">
      <div
        className={`file-row ${isFolder ? 'folder' : 'file'} ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, node); }}
        style={{ paddingLeft: `${14 + depth * 18}px` }}
      >
        {isFolder ? (
          <span className={`chevron ${isOpen ? 'open' : ''}`}>
            <ChevronRight size={13} />
          </span>
        ) : (
          <span className="chevron-placeholder" />
        )}

        {isFolder ? (
          <FolderOpen size={15} className="file-icon folder-icon" />
        ) : (
          <FileTypeIcon name={node.name} />
        )}

        <span className="file-name">{node.name}</span>
      </div>

      <AnimatePresence>
        {isFolder && isOpen && node.children && (
          <motion.div
            className="file-children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {node.children.map((child, i) => (
              <FileNode
                key={child.path || child.name + i}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Context menu for file/folder actions ── */
function ContextMenu({ x, y, node, onClose, onPick, onRename, onDelete, onNewFile, onNewFolder }) {
  const isFolder = node.type === 'folder';
  return (
    <div className="ws-context-menu" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
      <button onClick={() => { onPick(node); onClose(); }}>
        <FileText size={13} /> Select
      </button>
      {isFolder && (
        <>
          <button onClick={() => { onNewFile(node.path); onClose(); }}>
            <FilePlus size={13} /> New file
          </button>
          <button onClick={() => { onNewFolder(node.path); onClose(); }}>
            <FolderPlus size={13} /> New folder
          </button>
        </>
      )}
      <button onClick={() => { onRename(node); onClose(); }}>
        <Pencil size={13} /> Rename
      </button>
      <button className="danger" onClick={() => { onDelete(node); onClose(); }}>
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}

/* ── File viewer/editor panel ── */
function FileViewer({ path, content, onClose, onSave, onPick, readOnly }) {
  const [editContent, setEditContent] = useState(content);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formatting, setFormatting] = useState(false);
  // Brief green confirmation flash after a successful save (Save is ghost/outline by default)
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef(null);

  useEffect(() => {
    setEditContent(content);
    setDirty(false);
    setSaving(false);
    setFormatting(false);
    setSavedFlash(false);
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, [path, content]);

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(path, editContent);
      setDirty(false);
      setSavedFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setSavedFlash(false), 1600);
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFormat = async () => {
    setFormatting(true);
    try {
      const formatted = await formatSource(path, editContent);
      setEditContent(formatted);
      setDirty(formatted !== content);
    } catch (error) {
      alert('Format failed: ' + error.message);
    } finally {
      setFormatting(false);
    }
  };

  const fileName = path.split('/').pop();
  const fileInfo = getFileIconInfo(fileName);
  const lineCount = editContent.split('\n').length;

  return (
    <div className="ws-viewer">
      <div className="ws-viewer-header">
        <button className="ws-viewer-back" onClick={onClose} aria-label="Back to files" title="Back to files">
          <ArrowLeft size={16} /> <span className="ws-viewer-btn-label">Back</span>
        </button>
        <div className="ws-viewer-title">
          <span className="ws-viewer-name mono">
            {fileName}
            {dirty && <span className="dirty-dot" title="Unsaved changes" aria-label="Unsaved changes" />}
          </span>
          <span className="ws-viewer-crumb mono">{path}</span>
        </div>
        <div className="ws-viewer-actions">
          {onPick && (
            <button className="ws-viewer-pick" onClick={() => onPick(path)} title="Use this file as agent context">
              <FileText size={14} /> <span className="ws-viewer-btn-label">Select</span>
            </button>
          )}
          {!readOnly && canFormatPath(path) && (
            <button className="ws-viewer-pick" onClick={handleFormat} disabled={formatting} title="Format document">
              <AlignLeft size={14} /> <span className="ws-viewer-btn-label">{formatting ? 'Formatting...' : 'Format'}</span>
            </button>
          )}
          {!readOnly && (
            <button className={`ws-viewer-save ${savedFlash ? 'saved' : ''}`} onClick={handleSave} disabled={!dirty || saving}>
              {savedFlash ? <Check size={14} /> : <Save size={14} />}
              <span className="ws-viewer-btn-label">{savedFlash ? 'Saved' : saving ? 'Saving...' : 'Save'}</span>
            </button>
          )}
        </div>
      </div>
      <Suspense fallback={<div className="ws-empty">Loading code editor...</div>}>
        <CodeEditor
          path={path}
          value={editContent}
          onChange={value => { setEditContent(value); setDirty(value !== content); }}
          readOnly={readOnly}
        />
      </Suspense>
      <div className="ws-editor-status mono">
        <span>{fileInfo?.label || 'TEXT'}</span>
        <span>{lineCount} lines</span>
        <span>{editContent.length} chars</span>
        {dirty && <span className="dirty-indicator">Modified</span>}
      </div>
    </div>
  );
}

/* ── Main Workspace component ── */
export default function Workspace({
  workspace = {},
  workspaceLoading = false,
  onFileSelect,
  onFilePick,
  onFileRead,
  onFileSave,
  onFileCreate,
  onFolderCreate,
  onFileRename,
  onFileDelete,
  onUndo,
  undoPath = '',
  onRefresh,
  onChooseWorkspace,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [viewerFile, setViewerFile] = useState(null); // { path, content }
  const [toolsOpen, setToolsOpen] = useState(false);
  const readRequestId = useRef(0);

  const fileIndex = useMemo(() => buildFileIndex(workspace.tree || []), [workspace.tree]);

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return workspace.tree || [];
    const results = searchFiles(searchQuery, workspace.tree || []);
    const paths = new Set(results.map(r => r.path));
    const rebuild = (nodes) => nodes.map(node => {
      if (paths.has(node.path)) return node;
      if (node.children) {
        const rebuilt = rebuild(node.children);
        if (rebuilt.length > 0) return { ...node, children: rebuilt, open: true };
      }
      return null;
    }).filter(Boolean);
    return rebuild(workspace.tree || []);
  }, [workspace.tree, searchQuery]);

  const projectNodes = useMemo(() => filteredTree.filter(node => !isModelFileNode(node)), [filteredTree]);
  const modelNodes = useMemo(() => filteredTree.filter(isModelFileNode), [filteredTree]);

  const handleSelect = useCallback(async (path, node) => {
    setSelectedPath(path);
    onFileSelect?.(path);
    const requestId = ++readRequestId.current;
    if (node?.type !== 'file' || !onFileRead) return;

    try {
      const content = await onFileRead(path);
      if (readRequestId.current === requestId) {
        setViewerFile({ path, content: content ?? '', error: false });
      }
    } catch (err) {
      if (readRequestId.current === requestId) {
        setViewerFile({ path, content: `Error reading file: ${err.message}`, error: true });
      }
    }
  }, [onFileSelect, onFileRead]);

  const handlePick = useCallback((node) => {
    onFilePick?.(node.path, node);
  }, [onFilePick]);

  const handleContextMenu = useCallback((e, node) => {
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleNewFile = useCallback(async (parentPath) => {
    const name = prompt('New file name (e.g. notes.txt):');
    if (!name?.trim()) return;
    try {
      await onFileCreate?.(joinWorkspacePath(parentPath, name.trim()));
    } catch (err) {
      alert('Failed to create file: ' + err.message);
    }
  }, [onFileCreate]);

  const handleNewFolder = useCallback(async (parentPath) => {
    const name = prompt('New folder name:');
    if (!name?.trim()) return;
    try {
      await onFolderCreate?.(joinWorkspacePath(parentPath, name.trim()));
    } catch (err) {
      alert('Failed to create folder: ' + err.message);
    }
  }, [onFolderCreate]);

  const handleRename = useCallback(async (node) => {
    const oldName = node.name;
    const newName = prompt(`Rename "${oldName}" to:`, oldName);
    if (!newName?.trim() || newName.trim() === oldName) return;
    const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
    const newPath = joinWorkspacePath(parentPath, newName.trim());
    try {
      await onFileRename?.(node.path, newPath);
    } catch (err) {
      alert('Failed to rename: ' + err.message);
    }
  }, [onFileRename]);

  const handleDelete = useCallback(async (node) => {
    if (!confirm(`Delete "${node.name}"${node.type === 'folder' ? ' and all its contents' : ''}?`)) return;
    try {
      await onFileDelete?.(node.path, node.type);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }, [onFileDelete]);

  const handleSave = useCallback(async (path, content) => {
    await onFileSave?.(path, content);
  }, [onFileSave]);

  const extensionGroups = useMemo(() => {
    const groups = {};
    for (const file of fileIndex.allFiles) {
      const ext = file.extension;
      if (!groups[ext]) groups[ext] = [];
      groups[ext].push(file);
    }
    return groups;
  }, [fileIndex]);

  // If a file is open in the viewer, show that instead of the tree
  if (viewerFile) {
    return (
      <FileViewer
        path={viewerFile.path}
        content={viewerFile.content}
        onClose={() => setViewerFile(null)}
        onSave={handleSave}
        onPick={(path) => handlePick({ path, type: 'file', name: path.split('/').pop() })}
        readOnly={viewerFile.error === true}
      />
    );
  }

  return (
    <div className="screen-scroll workspace" onClick={() => { setContextMenu(null); setToolsOpen(false); }}>
      <div className="screen-pad">
        <div className="section-head">
          <div className="ws-header-row">
            <div>
              <h2>Files</h2>
              <p>{workspace.name || 'Device storage'}</p>
            </div>
            {/* One primary action + overflow menu (replaces the old 5-button, 3-group toolbar
                which had two identically-labeled "Folder" buttons doing different things) */}
            <div className="ws-header-actions">
              <button className="ws-primary-btn" onClick={() => handleNewFile('')} title="New file" aria-label="New file">
                <Plus size={16} /><span>New file</span>
              </button>
              <div className="ws-menu-anchor">
                <button
                  className="ws-menu-btn"
                  onClick={(e) => { e.stopPropagation(); setToolsOpen(value => !value); }}
                  title="More file actions"
                  aria-label="More file actions"
                  aria-expanded={toolsOpen}
                >
                  <MoreVertical size={16} />
                </button>
                {toolsOpen && (
                  <div className="ws-context-menu ws-tools-menu" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => { setToolsOpen(false); handleNewFolder(''); }}>
                      <FolderPlus size={13} /> New folder
                    </button>
                    <button type="button" onClick={() => { setToolsOpen(false); onUndo?.(); }} disabled={!undoPath} title={undoPath ? `Undo last workspace change to ${undoPath}` : 'No workspace backup available'}>
                      <RotateCcw size={13} /> Undo last change
                    </button>
                    <button type="button" onClick={() => { setToolsOpen(false); onRefresh?.(); }}>
                      <RefreshCw size={13} /> Refresh
                    </button>
                    <button type="button" onClick={() => { setToolsOpen(false); onChooseWorkspace?.(); }}>
                      <FolderOpen size={13} /> Choose device folder
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="ws-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Filter files or folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mono"
            aria-label="Filter workspace files"
          />
          {searchQuery && (
            <button className="ws-clear" onClick={() => setSearchQuery('')} aria-label="Clear">
              <X size={12} />
            </button>
          )}
        </div>

        {workspace.path && <div className="ws-path mono">Path: {workspace.path.startsWith('content://') ? 'Selected Android folder' : workspace.path}</div>}

        {/* Index summary */}
        {fileIndex.count > 0 && (
          <div className="ws-index-summary">
            <div className="index-header">
              <Database size={14} />
              <span>{fileIndex.count} files, {fileIndex.folders.length} folders, {Object.keys(extensionGroups).length} types</span>
            </div>
            <div className="index-tags">
              {Object.entries(extensionGroups).map(([ext, files]) => {
                const info = getFileIconInfo(`test.${ext}`);
                return (
                  <span key={ext} className="index-tag" title={`${files.length} ${ext.toUpperCase()} files`}>
                    {info.label || ext.toUpperCase()}
                  </span>
                );
              }).slice(0, 12)}
            </div>
          </div>
        )}

        {/* Loading state */}
        {workspaceLoading && (
          <div className="ws-empty">Loading files...</div>
        )}

        {/* File tree, split into Project files vs Model files (GGUF weights are a
            different asset type than source files and used to mix into the same flat list) */}
        {!workspaceLoading && (
          <div className="ws-tree">
            {filteredTree.length > 0 ? (
              <>
                {projectNodes.length > 0 && (
                  <>
                    <div className="ws-section-label">Project files</div>
                    {projectNodes.map((node, i) => (
                      <FileNode
                        key={node.path || node.name + i}
                        node={node}
                        depth={0}
                        selectedPath={selectedPath}
                        onSelect={handleSelect}
                        onContextMenu={handleContextMenu}
                      />
                    ))}
                  </>
                )}
                {modelNodes.length > 0 && (
                  <>
                    <div className="ws-section-label">Model files</div>
                    {modelNodes.map((node, i) => (
                      <FileNode
                        key={node.path || node.name + i}
                        node={node}
                        depth={0}
                        selectedPath={selectedPath}
                        onSelect={handleSelect}
                        onContextMenu={handleContextMenu}
                      />
                    ))}
                  </>
                )}
              </>
            ) : (
              <div className="ws-empty">
                {searchQuery ? 'No files match.' : 'No files found. Tap + to create a file or folder.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context menu overlay */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          onPick={handlePick}
          onRename={handleRename}
          onDelete={handleDelete}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
        />
      )}
    </div>
  );
}
