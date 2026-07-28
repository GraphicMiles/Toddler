import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, FolderOpen, ChevronRight, X, FileText, Database,
  Pencil, Trash2, FilePlus, FolderPlus, Save, ArrowLeft, RotateCcw,
} from 'lucide-react';
import { getFileIconInfo, buildFileIndex, searchFiles } from '../utils/fileIndex';
import './Workspace.css';

const joinWorkspacePath = (parent, name) => parent ? `${parent}/${name}` : name;

/* ── File tree node ── */
function FileNode({ node, depth = 0, selectedPath, onSelect, onContextMenu }) {
  const [isOpen, setIsOpen] = useState(node.open || depth === 0);
  const isFolder = node.type === 'folder';
  const isFile = node.type === 'file';
  const isSelected = selectedPath === node.path;
  const fileInfo = isFile ? getFileIconInfo(node.name) : null;

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
          <span className="file-icon file-badge mono" style={{ color: fileInfo?.color || 'var(--faint)' }}>
            {fileInfo?.label || '?'}
          </span>
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(path, editContent);
      setDirty(false);
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fileName = path.split('/').pop();
  const fileInfo = getFileIconInfo(fileName);

  return (
    <div className="ws-viewer">
      <div className="ws-viewer-header">
        <button className="ws-viewer-back" onClick={onClose}>
          <ArrowLeft size={16} /> Back
        </button>
        <span className="ws-viewer-name mono" style={{ color: fileInfo?.color }}>
          {fileInfo?.label} {fileName}
        </span>
        <div className="ws-viewer-actions">
          {onPick && (
            <button className="ws-viewer-pick" onClick={() => onPick(path)}>
              <FileText size={14} /> Select
            </button>
          )}
          {!readOnly && (
            <button className="ws-viewer-save" onClick={handleSave} disabled={!dirty || saving}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
      <textarea
        className="ws-viewer-content mono"
        value={editContent}
        onChange={(e) => { setEditContent(e.target.value); setDirty(true); }}
        readOnly={readOnly}
        spellCheck={false}
      />
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

  const handleSelect = useCallback(async (path, node) => {
    setSelectedPath(path);
    onFileSelect?.(path);
    // Open file in viewer
    if (node?.type === 'file' && onFileRead) {
      try {
        const content = await onFileRead(path);
        setViewerFile({ path, content: content ?? '', error: false });
      } catch (err) {
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
    <div className="screen-scroll workspace" onClick={() => setContextMenu(null)}>
      <div className="screen-pad">
        <div className="section-head">
          <div className="ws-header-row">
            <div>
              <h2>Files</h2>
              <p>{workspace.name || 'Device storage'}</p>
            </div>
            <div className="ws-header-actions">
              <button className="ws-action-btn" onClick={() => handleNewFile('')} title="New file">
                <FilePlus size={16} />
              </button>
              <button className="ws-action-btn" onClick={() => handleNewFolder('')} title="New folder">
                <FolderPlus size={16} />
              </button>
              <button className="ws-action-btn" onClick={onUndo} title={undoPath ? `Undo last save to ${undoPath}` : 'No workspace backup available'} disabled={!undoPath}>
                <RotateCcw size={16} />
              </button>
              <button className="ws-action-btn" onClick={onRefresh} title="Refresh">
                <Database size={16} />
              </button>
              <button className="ws-action-btn" onClick={onChooseWorkspace} title="Choose device folder">
                <FolderOpen size={16} />
              </button>
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
                  <span key={ext} className="index-tag" title={`${files.length} ${ext.toUpperCase()} files`} style={{ color: info.color }}>
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

        {/* File tree */}
        {!workspaceLoading && (
          <div className="ws-tree">
            {filteredTree.length > 0 ? (
              filteredTree.map((node, i) => (
                <FileNode
                  key={node.path || node.name + i}
                  node={node}
                  depth={0}
                  selectedPath={selectedPath}
                  onSelect={handleSelect}
                  onContextMenu={handleContextMenu}
                />
              ))
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
