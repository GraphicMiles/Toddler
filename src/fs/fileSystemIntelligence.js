/**
 * File System Intelligence
 * Android-optimized project understanding
 */

export class FileSystemIntelligence {
  analyzeStructure(tree) {
    if (!tree || tree.length === 0) return { type: 'empty' };

    const folders = tree.filter(n => n.type === 'folder').length;
    const files = tree.filter(n => n.type === 'file').length;

    const hasSrc = tree.some(n => n.name === 'src' || n.name === 'app');
    const hasTests = tree.some(n => n.name.includes('test') || n.name.includes('spec'));
    const hasGit = tree.some(n => n.name === '.git');

    return {
      type: 'project',
      folders,
      files,
      hasSrc,
      hasTests,
      hasGit,
      summary: `${folders} folders, ${files} files${hasSrc ? ' (src present)' : ''}${hasTests ? ' (tests detected)' : ''}`,
    };
  }

  findSimilar(query, tree) {
    if (!query || !tree) return [];

    const q = query.toLowerCase();
    return tree
      .filter(node => 
        node.name.toLowerCase().includes(q) || 
        (node.path && node.path.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }
}

export const fileSystemIntelligence = new FileSystemIntelligence();