import { useCallback, useState } from "react";

/**
 * Memori sesi untuk state tampilan (tab aktif, filter, konten yang sedang
 * dibuka). Screen di App.tsx di-unmount saat berpindah halaman, jadi tanpa ini
 * user yang menekan back akan kembali ke tampilan awal, bukan ke konten yang
 * terakhir dilihat. Memori dibersihkan saat user pindah lewat NavBar (mulai
 * baru) dan dipertahankan saat kembali lewat tombol back.
 */
const memory = new Map<string, unknown>();

export function clearViewMemory(): void {
  memory.clear();
}

/** Seperti useState, tetapi nilainya bertahan walau komponen di-unmount. */
export function useRememberedState<T>(
  key: string,
  initial: T | (() => T),
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (memory.has(key)) return memory.get(key) as T;
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        memory.set(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
