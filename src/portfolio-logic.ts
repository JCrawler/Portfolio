/**
 * Pure portfolio utility functions for project filtering and theme switching.
 */

export interface ProjectItem {
  id: string;
  title: string;
  category?: string;
  description: string;
  tags: string[];
}

/**
 * Extracts unique list of tags from project array, with 'All' at the beginning.
 */
export function extractUniqueTags(projects: ProjectItem[]): string[] {
  const set = new Set<string>();
  for (const p of projects) {
    for (const t of p.tags) {
      set.add(t);
    }
  }
  return ['All', ...Array.from(set)];
}

/**
 * Filters projects based on the active tag. Case-insensitive comparison.
 * If activeTag is 'all' or empty, returns all projects.
 */
export function filterProjects(projects: ProjectItem[], activeTag: string): ProjectItem[] {
  if (!activeTag || activeTag.toLowerCase() === 'all') {
    return [...projects];
  }
  const target = activeTag.toLowerCase();
  return projects.filter((p) =>
    p.tags.some((tag) => tag.toLowerCase() === target)
  );
}

/**
 * Resolves the theme given a stored preference and the system setting.
 */
export function resolveTheme(
  storedTheme: string | null | undefined,
  systemPrefersDark: boolean
): 'dark' | 'light' {
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }
  return systemPrefersDark ? 'dark' : 'light';
}

/**
 * Toggles between 'dark' and 'light'.
 */
export function toggleTheme(current: 'dark' | 'light'): 'dark' | 'light' {
  return current === 'dark' ? 'light' : 'dark';
}
