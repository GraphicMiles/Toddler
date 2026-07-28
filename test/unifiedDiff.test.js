import assert from 'node:assert/strict';
import { applyFilePatch, applyUnifiedDiff, parseUnifiedDiff, summarizeUnifiedDiff } from '../src/patch/unifiedDiff.js';

const diff = `--- a/src/example.js
+++ b/src/example.js
@@ -1,3 +1,4 @@
 const value = 1;
-console.log(value);
+const doubled = value * 2;
+console.log(doubled);
 export default value;
`;
const parsed = parseUnifiedDiff(diff);
assert.equal(parsed.length, 1);
assert.equal(parsed[0].newPath, 'src/example.js');
assert.equal(applyFilePatch('const value = 1;\nconsole.log(value);\nexport default value;\n', parsed[0]), 'const value = 1;\nconst doubled = value * 2;\nconsole.log(doubled);\nexport default value;\n');
assert.deepEqual(summarizeUnifiedDiff(diff), [{ path: 'src/example.js', additions: 2, deletions: 1 }]);
assert.throws(() => parseUnifiedDiff('--- a/../secret\n+++ b/../secret\n@@ -1 +1 @@\n-a\n+b'), /unsafe/);

const files = new Map([['src/example.js', 'const value = 1;\nconsole.log(value);\nexport default value;\n']]);
const provider = {
  readText: async path => files.get(path),
  writeText: async (path, content) => { files.set(path, content); return { backupId: 'backup-1' }; },
  restoreBackup: async () => {},
};
const result = await applyUnifiedDiff(provider, diff);
assert.equal(result.files[0].additions, 2);
assert.match(files.get('src/example.js'), /doubled/);
console.log('unified diff tests passed');
