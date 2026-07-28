function unquote(value) {
  const text = value.trim();
  if (text.length >= 2 && text[0] === text.at(-1) && ['"', "'"].includes(text[0])) return text.slice(1, -1);
  return text;
}

function parseScalar(value) {
  const text = unquote(value);
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text.startsWith('[') && text.endsWith(']')) return text.slice(1, -1).split(',').map(item => unquote(item)).filter(Boolean);
  return text;
}

export function parseSkillMarkdown(markdown) {
  const text = String(markdown || '').replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) throw new Error('SKILL.md must start with YAML frontmatter.');
  const end = text.indexOf('\n---', 4);
  if (end < 0) throw new Error('SKILL.md frontmatter is not closed.');
  const frontmatter = text.slice(4, end).split('\n');
  const body = text.slice(end + 4).trim();
  const data = {};
  let index = 0;

  while (index < frontmatter.length) {
    const line = frontmatter[index];
    if (!line.trim() || line.trimStart().startsWith('#')) { index++; continue; }
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) throw new Error(`Cannot parse SKILL.md frontmatter line ${index + 2}.`);
    const [, key, rawValue] = match;
    if (rawValue === '>' || rawValue === '>-' || rawValue === '|' || rawValue === '|-') {
      const values = [];
      index++;
      while (index < frontmatter.length && /^\s+/.test(frontmatter[index])) { values.push(frontmatter[index].trim()); index++; }
      data[key] = values.join(rawValue.startsWith('>') ? ' ' : '\n');
      continue;
    }
    if (!rawValue) {
      const nested = {};
      const list = [];
      index++;
      while (index < frontmatter.length && /^\s+/.test(frontmatter[index])) {
        const nestedLine = frontmatter[index].trim();
        if (nestedLine.startsWith('- ')) list.push(parseScalar(nestedLine.slice(2)));
        else {
          const nestedMatch = nestedLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
          if (nestedMatch) nested[nestedMatch[1]] = parseScalar(nestedMatch[2]);
        }
        index++;
      }
      data[key] = list.length ? list : nested;
      continue;
    }
    data[key] = parseScalar(rawValue);
    index++;
  }

  const metadata = typeof data.metadata === 'object' && !Array.isArray(data.metadata) ? data.metadata : {};
  const permissions = typeof data.permissions === 'object' && !Array.isArray(data.permissions) ? data.permissions : {};
  const allowedTools = Array.isArray(data['allowed-tools'])
    ? data['allowed-tools']
    : String(data['allowed-tools'] || '').split(/[ ,]+/).filter(Boolean);
  const id = String(data.name || '').trim();
  return {
    id,
    name: metadata.title || id.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
    version: String(metadata.version || data.version || '1.0.0'),
    description: String(data.description || '').trim(),
    license: String(data.license || 'Unknown'),
    triggers: Array.isArray(data.triggers) ? data.triggers.map(String) : [],
    allowedTools: allowedTools.map(String),
    permissions: {
      workspaceRead: permissions.workspaceRead === true,
      workspaceWrite: permissions.workspaceWrite === true,
      network: permissions.network === true,
      execute: false,
    },
    instructions: body,
    role: String(metadata.role || 'custom'),
    external: true,
  };
}
