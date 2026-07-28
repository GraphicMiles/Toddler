const OPERATIONS = Object.freeze({ plus: '+', add: '+', '+': '+', minus: '-', subtract: '-', '-': '-', times: '*', multiplied: '*', multiply: '*', '*': '*', '×': '*', divided: '/', divide: '/', over: '/', '/': '/' });

export function deterministicAnswer(message = '') {
  const normalized = String(message).toLowerCase().replace(/what(?:'s| is)|calculate|compute|please|answer/g, ' ').replace(/\?/g, ' ').trim();
  const match = normalized.match(/^(-?\d+(?:\.\d+)?)\s*(plus|add|\+|minus|subtract|-|times|multiplied(?: by)?|multiply|\*|×|divided(?: by)?|divide|over|\/)\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const left = Number(match[1]);
  const right = Number(match[3]);
  const operator = OPERATIONS[match[2].replace(' by', '')];
  if (operator === '/' && right === 0) return 'Division by zero is undefined.';
  const value = operator === '+' ? left + right : operator === '-' ? left - right : operator === '*' ? left * right : left / right;
  if (!Number.isFinite(value)) return null;
  return `${left} ${operator} ${right} = ${Number.isInteger(value) ? value : Number(value.toFixed(10))}`;
}
