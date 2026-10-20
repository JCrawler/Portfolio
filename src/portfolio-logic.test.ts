import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractUniqueTags,
  filterProjects,
  resolveTheme,
  toggleTheme,
  type ProjectItem,
} from './portfolio-logic.ts';

const SAMPLE_PROJECTS: ProjectItem[] = [
  {
    id: 'hanapkada',
    title: 'HanapKada',
    description: 'Algorithmic group formation',
    tags: ['Python', 'Algorithms', 'OOP'],
  },
  {
    id: 'ai-research',
    title: 'AI Research Automation',
    description: 'n8n research automation',
    tags: ['n8n', 'Supabase', 'Render'],
  },
  {
    id: 'fora-one',
    title: 'Fora One Dagupan',
    description: 'Network case study',
    tags: ['Networking', 'Cisco CCNA'],
  },
];

test('extractUniqueTags gathers distinct tags with "All" first', () => {
  const tags = extractUniqueTags(SAMPLE_PROJECTS);
  assert.equal(tags[0], 'All');
  assert.ok(tags.includes('Python'));
  assert.ok(tags.includes('n8n'));
  assert.ok(tags.includes('Networking'));
});

test('filterProjects with "All" returns all items', () => {
  assert.equal(filterProjects(SAMPLE_PROJECTS, 'All').length, 3);
  assert.equal(filterProjects(SAMPLE_PROJECTS, 'all').length, 3);
  assert.equal(filterProjects(SAMPLE_PROJECTS, '').length, 3);
});

test('filterProjects matches case-insensitively', () => {
  const pythonProjects = filterProjects(SAMPLE_PROJECTS, 'python');
  assert.equal(pythonProjects.length, 1);
  assert.equal(pythonProjects[0].title, 'HanapKada');

  const n8nProjects = filterProjects(SAMPLE_PROJECTS, 'n8n');
  assert.equal(n8nProjects.length, 1);
  assert.equal(n8nProjects[0].title, 'AI Research Automation');
});

test('filterProjects returns empty list for non-matching tag', () => {
  const nonMatch = filterProjects(SAMPLE_PROJECTS, 'Rust');
  assert.equal(nonMatch.length, 0);
});

test('resolveTheme respects explicit stored preference', () => {
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
});

test('resolveTheme falls back to system preference when unset', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
  assert.equal(resolveTheme(undefined, true), 'dark');
});

test('toggleTheme alternates between dark and light', () => {
  assert.equal(toggleTheme('dark'), 'light');
  assert.equal(toggleTheme('light'), 'dark');
});
