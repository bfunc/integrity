import { writable } from 'svelte/store';

export const filterState = writable({
  source: null,
  severities: [],
  types: [],
  sourceTypes: [],
  regions: [],
});

export function resetFilters() {
  filterState.set({ source: null, severities: [], types: [], sourceTypes: [], regions: [] });
}
