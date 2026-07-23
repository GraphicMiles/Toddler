import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FolderOpen, ChevronRight, X } from 'lucide-react';
import './Workspace.css';

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
        style={{ paddingLeft: `${14 + depth * 18}px` }}
        whileHover={{ x: 2 }}
        transition={{ duration: 0.1 }}
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
          <span className="file-icon file-badge mono" style={{ color: fileInfo.color }}>
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

export default function Workspace({ workspace = {}, onFileSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState(null);

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return workspace.tree || [];
    const query = searchQuery.toLowerCase();
    const filterNode = (node) => {
      if (node.type === 'file') {
        return node.name.toLowerCase().includes(query) ? node : null;
      }
      const filteredChildren = (node.children || []).map(filterNode).filter(Boolean);
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
            placeholder="Filter files"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mono"
            aria-label="Filter files"
          />
          {searchQuery && (
            <button className="ws-clear" onClick={() => setSearchQuery('')} aria-label="Clear">
              <X size={12} />
            </button>
          )}
        </div>

        {workspace.path && <div className="ws-path mono">{workspace.path}</div>}

        <div className="ws-tree">
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
            <div className="ws-empty">No files match.</div>
          )}
        </div>
      </div>
    </div>
  );
}
