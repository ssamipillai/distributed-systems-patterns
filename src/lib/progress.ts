import { create } from "zustand";

const KEY = "quorum-progress-v1";

type ProgressState = {
  visited: string[];
  mastered: string[];
  hydrated: boolean;
  hydrate: () => void;
  markVisited: (slug: string) => void;
  toggleMastered: (slug: string) => void;
};

function load(): Pick<ProgressState, "visited" | "mastered"> {
  if (typeof window === "undefined") return { visited: [], mastered: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { visited: [], mastered: [] };
    const parsed = JSON.parse(raw) as { visited?: string[]; mastered?: string[] };
    return {
      visited: Array.isArray(parsed.visited) ? parsed.visited : [],
      mastered: Array.isArray(parsed.mastered) ? parsed.mastered : [],
    };
  } catch {
    return { visited: [], mastered: [] };
  }
}

function save(visited: string[], mastered: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify({ visited, mastered }));
}

export const useProgress = create<ProgressState>((set, get) => ({
  visited: [],
  mastered: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    const data = load();
    set({ ...data, hydrated: true });
  },
  markVisited: (slug) => {
    const { visited, mastered } = get();
    if (visited.includes(slug)) return;
    const next = [...visited, slug];
    save(next, mastered);
    set({ visited: next });
  },
  toggleMastered: (slug) => {
    const { visited, mastered } = get();
    const next = mastered.includes(slug)
      ? mastered.filter((s) => s !== slug)
      : [...mastered, slug];
    const nextVisited = visited.includes(slug) ? visited : [...visited, slug];
    save(nextVisited, next);
    set({ visited: nextVisited, mastered: next });
  },
}));
