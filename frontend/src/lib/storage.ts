import type { GraphState } from '@/lib/redux/slices/graphSlice';

const STORAGE_KEY = 'graph-app-state';

export function saveGraphToStorage(state: GraphState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save graph to localStorage:', error);
  }
}

export function loadGraphFromStorage(): GraphState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as GraphState;
  } catch (error) {
    console.error('Failed to load graph from localStorage:', error);
    return null;
  }
}

export function clearGraphStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear graph storage:', error);
  }
}

export function exportGraphAsJSON(state: GraphState): string {
  return JSON.stringify(state, null, 2);
}

export function importGraphFromJSON(jsonString: string): GraphState | null {
  try {
    const parsed = JSON.parse(jsonString);
    // Basic validation
    if (!parsed.nodes || !Array.isArray(parsed.nodes) || !parsed.edges || !Array.isArray(parsed.edges)) {
      return null;
    }
    return parsed as GraphState;
  } catch (error) {
    console.error('Failed to import graph from JSON:', error);
    return null;
  }
}
