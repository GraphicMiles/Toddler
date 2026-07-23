import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FolderOpen, File, ChevronRight, X, Plus, RefreshCw } from 'lucide-react';
import './FilePanel.css';

const FILE_ICONS = {
  js: { color: '#f7df1e', label: 'JS' },
  jsx: { color: '#61dafb', label: 'JSX' },
  ts: { color: '#3178c6', label: 'TS' },
  tsx: { color: '#3178c6', label: 'TSX' },
  py: { color: '#3776ab', label: 'PY' },
  css: { color: '#264de4', label: 'CSS' },
  html: { color: '#e34c26', label: 'HTML' },
  json: { color: '#f7df1e', label: 'JSON' },
  md: { color: '#083fa1', label: 'MD' },
  gitignore: { color: '#f05032', label: 'GIT' },
  env: { color: '#ecd53f', label: 'ENV' },
};

function getFileInfo(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return FILE_ICONS[ext] || { color: 'var(--faint)', label: ext?.toUpperCase() || '?' };
}

function FileNode({ node, depth = 0, onSelect, selectedPath }) {
  const [isOpen, setIsOpen] = useState(node.open || depth === 0);
  const isFolder = node.type === 'folder';
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      onSelect?.(node.path);
    }
  };

  const fileInfo = !isFolder ? getFileInfo(node.name) : null;

  return (
    <div className="file-node">
      <motion.div
        className={`file-row ${isFolder ? 'folder' : 'file'} ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        whileHover={{ x: 2 }}
        transition={{ duration: 0.1 }}
      >
        {isFolder ? (
          <motion.span
            className={`chevron ${isOpen ? 'open' : ''}`}
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight size={12} />
          </motion.span>
        ) : (
          <span className="chevron-placeholder" />
        )}

        {isFolder ? (
          <FolderOpen size={14} className="file-icon folder-icon" />
        ) : (
          <span 
            className="file-icon file-badge mono"
            style={{ color: fileInfo.color }}
          >
            {fileInfo.label}
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
                selectedPath={selectedPath}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FilePanel({ 
  isOpen, 
  onClose, 
  workspace = {},
  onFileSelect,
  onWorkspaceChange 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState(null);

  // Filter files based on search
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return workspace.tree || [];
    
    const query = searchQuery.toLowerCase();
    
    const filterNode = (node) => {
      if (node.type === 'file') {
        return node.name.toLowerCase().includes(query) ? node : null;
      }
      
      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter(Boolean);
      
      if (filteredChildren.length > 0 || node.name.toLowerCase().includes(query)) {
        return { ...node, children: filteredChildren, open: true };
      }
      return null;
    };
    
    return (workspace.tree || []).map(filterNode).filter(Boolean);
  }, [workspace.tree, searchQuery]);

  const handleFileSelect = (path) => {
    setSelectedPath(path);
    onFileSelect?.(path);
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose?.();
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="file-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <motion.aside
        className={`file-panel ${isOpen ? 'open' : ''}`}
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Handle (mobile) */}
        <div className="panel-handle">
          <span />
        </div>

        {/* Header */}
        <div className="panel-header">
          <div className="panel-title display">
            Workspace
            <button className="panel-close" onClick={handleClose}>
              <X size={14} />
            </button>
          </div>

          <div className="panel-search">
            <Search size={13} />
            <input
              type="text"
              placeholder="Filter files…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mono"
            />
            {searchQuery && (
              <button 
                className="search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="panel-actions">
            <motion.button
              className="panel-action-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Refresh"
            >
              <RefreshCw size={13} />
            </motion.button>
            <motion.button
              className="panel-action-btn primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="New file"
            >
              <Plus size={13} />
            </motion.button>
          </div>
        </div>

        {/* File Tree */}
        <div className="panel-tree">
          {filteredTree.length > 0 ? (
            filteredTree.map((node, i) => (
              <FileNode
                key={node.path || node.name + i}
                node={node}
                depth={0}
                onSelect={handleFileSelect}
                selectedPath={selectedPath}
              />
            ))
          ) : (
            <div className="panel-empty">
              {searchQuery ? 'No files match.' : 'No files in workspace.'}
            </div>
          )}
        </div>

        {/* Footer */}
        {workspace.path && (
          <div className="panel-footer mono">
            {workspace.path}
          </div>
        )}
      </motion.aside>
    </>
  );
}
