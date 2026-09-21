import { useEffect, useRef } from "react";

/**
 * Tumpukan (LIFO) handler tombol back untuk overlay: modal, bottom sheet,
 * detail view, dropdown, dll. Overlay yang paling akhir dibuka menangani back
 * lebih dulu, sehingga tombol back Android menutup modal alih-alih langsung
 * meninggalkan halaman (atau memunculkan dialog "Exit App").
 */
interface BackEntry {
  handler: () => void;
}

const stack: BackEntry[] = [];

/**
 * Daftarkan overlay ke tumpukan selama `active` bernilai true.
 * `onBack` harus menutup overlay tersebut.
 */
export function useBackHandler(active: boolean, onBack: () => void): void {
  const latest = useRef(onBack);
  latest.current = onBack;

  useEffect(() => {
    if (!active) return;
    const entry: BackEntry = { handler: () => latest.current() };
    stack.push(entry);
    return () => {
      const index = stack.indexOf(entry);
      if (index >= 0) stack.splice(index, 1);
    };
  }, [active]);
}

/** Jalankan handler overlay teratas. Mengembalikan true bila ada yang menangani. */
export function handleOverlayBack(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.handler();
  return true;
}
