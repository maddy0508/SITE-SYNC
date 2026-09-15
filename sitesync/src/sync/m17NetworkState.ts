import type { NetworkStateSource } from './syncLifecycle';

/** QA-only connectivity source. It observes reachability of the isolated M1.7 Supabase endpoint. */
export function createM17NetworkStateSource(url: string, intervalMs = 5000): NetworkStateSource {
  return {
    subscribe(listener) {
      let active = true;
      let previous: boolean | null = null;

      const probe = async () => {
        try {
          await fetch(url, { method: 'HEAD' });
          if (!active) return;
          if (previous !== true) listener(true);
          previous = true;
        } catch {
          if (!active) return;
          if (previous !== false) listener(false);
          previous = false;
        }
      };

      void probe();
      const timer = setInterval(() => { void probe(); }, intervalMs);
      return () => {
        active = false;
        clearInterval(timer);
      };
    },
  };
}
