import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FolderOpen, ChevronRight, X, FileText, Database } from 'lucide-react';
import { getFileIconInfo, buildFileIndex, searchFiles, getFilesByExtension } from '../utils/fileIndex';
import './Workspace.css';

function FileNode({ node, depth = 0, onSelect, onFolderSelect, selectedPath, selectedFolder }) {
  const [isOpen, setIsOpen] = useState(node.open || depth === 0);
  const isFolder = node.type === 'folder';
  const isFile = node.type === 'file';
  const isSelected = selectedPath === node.path || selectedFolder === node.path;

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
      onFolderSelect?.(node.path, node.name);
    } else if (isFile) {
      onSelect?.(node.path);
    }
  };

  const fileInfo = isFile ? getFileIconInfo(node.name) : null;

  return (
    <div className="file-node">
      <motion.div
        className={`file-row ${isFolder ? 'folder' : 'file'} ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        style={{ paddingLeft: `${14 + depth * 18}px` }}
        whileHover={{ x: 2 }}
        transition={{ duration: 0.1 }}
        aria-label={isFolder ? `Folder: ${node.name}` : `File: ${node.name}`}
      >
        {isFolder ? (
          <motion.span
            className={`chevron ${isOpen ? 'open' : ''}`}
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight size={13} />
          </motion.span>
        ) : (
          <span className="chevron-placeholder" />
        )}

        {isFolder ? (
          <FolderOpen size={15} className="file-icon folder-icon" />
        ) : (
          <span
            className="file-icon file-badge mono"
            style={{ color: fileInfo?.color || 'var(--faint)' }}
            title={fileInfo?.label || '?'}
          >
            {fileInfo?.label || '?' }
          </span>
        )}

        <span className="file-name">{node.name}</span>
      </motion.div>

      <AnimatePresence>
        {isFolder && isOpen && node.children && (
          <motion.div
            className="file-children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          >
            {node.children.map((child, i) => (
              <FileNode
                key={child.path || child.name + i}
                node={child}
                depth={depth + 1}
                onSelect={onSelect}
                onFolderSelect={onFolderSelect}
                selectedPath={selectedPath}
                selectedFolder={selectedFolder}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Workspace({ workspace = {}, onFileSelect, onFolderSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);

  // Build index for search and retrieval
  const fileIndex = useMemo(() => buildFileIndex(workspace.tree || []), [workspace.tree]);

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return workspace.tree || [];
    const results = searchFiles(searchQuery, workspace.tree || []);
    // Convert results back to tree structure for display
    const paths = new Set(results.map(r => r.path));
    const rebuild = (nodes) => {
      return nodes.map(node => {
        if (paths.has(node.path)) return node;
        if (node.children) {
          const rebuilt = rebuild(node.children);
          if (rebuilt.length > 0) return { ...node, children: rebuilt, open: true };
        }
        return null;
      }).filter(Boolean);
    };
    return rebuild(workspace.tree || []);
  }, [workspace.tree, searchQuery]);

  const handleFileSelect = (path) => {
    setSelectedPath(path);
    setSelectedFolder(null);
    onFileSelect?.(path);
  };

  const handleFolderSelect = (path, name) => {
    setSelectedFolder(path);
    setSelectedPath(path);
    onFolderSelect?.(path, name);
  };

  const extensionGroups = useMemo(() => {
    const groups = {};
    for (const file of fileIndex.allFiles) {
      const ext = file.extension;
      if (!groups[ext]) groups[ext] = [];
      groups[ext].push(file);
    }
    return groups;
  }, [fileIndex]);

  return (
    <div className="screen-scroll workspace">
      <div className="screen-pad">
        <div className="section-head">
          <h2>Workspace</h2>
          <p>{workspace.name || 'Local project'}</p>
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

        {workspace.path && <div className="ws-path mono">Path: {workspace.path}</div>}

        {/* Index summary by extension */}
        <div className="ws-index-summary">
          <div className="index-header">
            <Database size={14} />
            <span>Indexed: {fileIndex.count} files · {fileIndex.folders.length} folders · {Object.keys(extensionGroups).length} types</span>
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

        <div className="ws-tree">
          {filteredTree.length > 0 ? (
            filteredTree.map((node, i) => (
              <FileNode
                key={node.path || node.name + i}
                node={node}
                depth={0}
                onSelect={handleFileSelect}
                onFolderSelect={handleFolderSelect}
                selectedPath={selectedPath}
                selectedFolder={selectedFolder}
              />
            ))
          ) : (
            <div className="ws-empty">No files or folders match.</div>
          )}
        </div>
      </div>
    </div>
  );
}
