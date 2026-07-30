import { useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { buildRepositoryIndex, readRepositoryIndex } from '../context/repositoryIndex.js';
import { showToast } from '../utils/toast.js';

export default function RepositoryIndexPanel({ workspaceId, workspaceProvider, workspaceTree }) {
  const [index, setIndex] = useState(() => readRepositoryIndex(workspaceId));
  const [progress, setProgress] = useState(null);
  const [building, setBuilding] = useState(false);

  const build = async () => {
    setBuilding(true);
    try {
      const result = await buildRepositoryIndex({ workspaceId, workspaceProvider, workspaceTree, onProgress: setProgress });
      setIndex(result);
    } catch (error) {
        showToast(`Index failed: ${error.message}`, 'error');
      }
    finally { setBuilding(false); setProgress(null); }
  };

  return (
    <section className="settings-card">
      <h3><Database size={16} /> Local repository intelligence</h3>
      <p className="setting-help">Builds a bounded local index of paths, symbols, imports, and calls. Source contents are read for analysis but only relationship metadata is persisted.</p>
      {index ? (
        <p className="setting-help">{index.filesIndexed} files · {Math.round(index.bytesIndexed / 1024)} KiB analyzed · {index.skipped} skipped · {new Date(index.createdAt).toLocaleString()}</p>
      ) : <p className="setting-help">No repository index has been built for this workspace.</p>}
      <button onClick={build} disabled={building || !workspaceTree.length}><RefreshCw size={14} /> {building ? `Indexing ${progress?.completed || 0}/${progress?.total || 0}` : index ? 'Rebuild index' : 'Build index'}</button>
    </section>
  );
}
