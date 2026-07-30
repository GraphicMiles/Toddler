import assert from 'node:assert/strict';
import { buildFollowUps, detectTopics } from '../src/agent/followUpSuggestions.js';

// topic detection
assert.ok(detectTopics('I want to learn about AI agents and LLMs').includes('ai'));
assert.ok(detectTopics('build a react component with tailwind').includes('frontend'));
assert.ok(detectTopics('set up an express server with a database').includes('backend'));

// category follow-ups present
let r = buildFollowUps({ category: 'code_generate', answer: 'here is a function' });
assert.ok(r.suggestions.length >= 1 && r.suggestions.length <= 4);
assert.ok(r.suggestions.some(s => /test|typescript|explain/i.test(s)));

// THE key feature: AI discussed earlier, frontend now -> bridge suggestion
r = buildFollowUps({ category: 'explain', userMessage: 'how do I build a website with react', priorTopics: ['ai'] });
assert.ok(r.suggestions.some(s => /AI agent/i.test(s)), 'should bridge AI + frontend');
assert.ok(r.topics.includes('ai') && r.topics.includes('frontend'));

// bridge from within a single message mentioning both
r = buildFollowUps({ userMessage: 'can an AI build my frontend', answer: '' });
assert.ok(r.suggestions.some(s => /website|AI agent/i.test(s)));

// frontend + backend bridge
r = buildFollowUps({ userMessage: 'I built a react UI', answer: 'now you need an api server', priorTopics: ['frontend'] });
assert.ok(r.suggestions.some(s => /backend|connect|end to end/i.test(s)));

// no topics -> still returns generic chat follow-ups, no crash
r = buildFollowUps({ category: 'chat', answer: 'hello' });
assert.ok(Array.isArray(r.suggestions));

// respects max
r = buildFollowUps({ category: 'research', userMessage: 'ai and frontend', priorTopics: ['ai', 'frontend'], max: 2 });
assert.ok(r.suggestions.length <= 2);

console.log('follow-up suggestions tests passed');
