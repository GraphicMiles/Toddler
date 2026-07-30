/**
 * Deterministic formatting answers (zero-token).
 *
 * Many "formatting" requests don't need a 70B model at all — they're pure string
 * transforms. Handling them in JS gives an instant, free, always-correct answer
 * and saves the user's token quota for real reasoning.
 *
 * Returns a formatted string result, or null if the request isn't a supported
 * deterministic transform (so the caller falls through to the model).
 */

// Detect "<verb> ... : <payload>" or "<verb> this: <payload>" style requests.
function splitPayload(message) {
  const idx = message.indexOf(':');
  if (idx === -1) return { instruction: message, payload: '' };
  return { instruction: message.slice(0, idx), payload: message.slice(idx + 1).trim() };
}

export function deterministicFormat(message = '') {
  const text = String(message);
  const lower = text.toLowerCase();
  const { payload } = splitPayload(text);

  // ---- JSON pretty-print / minify ----
  if (/\b(pretty|format|prettify|beautify|indent)\b/.test(lower) && /\bjson\b/.test(lower) && payload) {
    try { return '```json\n' + JSON.stringify(JSON.parse(payload), null, 2) + '\n```'; }
    catch { return null; } // invalid JSON — let the model try
  }
  if (/\bminify\b/.test(lower) && /\bjson\b/.test(lower) && payload) {
    try { return '```json\n' + JSON.stringify(JSON.parse(payload)) + '\n```'; }
    catch { return null; }
  }

  // ---- case conversions on a quoted / trailing payload ----
  const caseTarget = payload || afterTo(text);
  if (caseTarget) {
    if (/\bto (upper\s?case|uppercase)\b/.test(lower) || /\bmake .* uppercase\b/.test(lower)) return caseTarget.toUpperCase();
    if (/\bto (lower\s?case|lowercase)\b/.test(lower) || /\bmake .* lowercase\b/.test(lower)) return caseTarget.toLowerCase();
    if (/\bto (title case)\b/.test(lower) || /\btitle case\b/.test(lower)) return titleCase(caseTarget);
    if (/camel[\s_-]?case/.test(lower)) return toCamel(caseTarget);
    if (/snake[\s_-]?case/.test(lower)) return toSnake(caseTarget);
    if (/kebab[\s_-]?case/.test(lower)) return toKebab(caseTarget);
  }

  // ---- CSV → markdown table ----
  if (/\bcsv\b/.test(lower) && /\b(markdown|md|table)\b/.test(lower) && payload && payload.includes(',')) {
    const table = csvToMarkdown(payload);
    if (table) return table;
  }

  return null;
}

function afterTo(text) {
  const m = text.match(/(?:convert|make|turn)\b(.*?)\bto\b/i);
  if (!m) return '';
  // Take the part before "to" as the subject if it's quoted, else empty.
  const q = text.match(/["'`](.+?)["'`]/);
  return q ? q[1] : '';
}

function titleCase(s) { return s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()); }
function words(s) { return s.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().split(/\s+/).filter(Boolean); }
function toCamel(s) { const w = words(s); return w.map((x, i) => i === 0 ? x.toLowerCase() : x[0].toUpperCase() + x.slice(1).toLowerCase()).join(''); }
function toSnake(s) { return words(s).map(x => x.toLowerCase()).join('_'); }
function toKebab(s) { return words(s).map(x => x.toLowerCase()).join('-'); }

function csvToMarkdown(csv) {
  const rows = csv.split(/\\n|\n/).map(r => r.trim()).filter(Boolean).map(r => r.split(',').map(c => c.trim()));
  if (rows.length < 1) return null;
  const cols = rows[0].length;
  const header = rows[0];
  const body = rows.slice(1);
  const line = arr => '| ' + arr.join(' | ') + ' |';
  const sep = '| ' + Array(cols).fill('---').join(' | ') + ' |';
  return [line(header), sep, ...body.map(r => line(r.concat(Array(Math.max(0, cols - r.length)).fill(''))))].join('\n');
}
