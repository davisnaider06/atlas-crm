"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cache SWR (stale-while-revalidate) leve, em escopo de módulo.
 *
 * Problema que resolve: as páginas do CRM buscavam os dados em `useState`
 * local e refaziam o fetch (com spinner) toda vez que o SDR trocava de aba,
 * porque o Next remonta o componente da página a cada navegação.
 *
 * Como o cache vive no escopo do módulo, ele sobrevive à remontagem: ao voltar
 * para uma aba já visitada os dados aparecem instantaneamente e a revalidação
 * acontece em segundo plano (sem tela de "carregando").
 */

type CacheEntry<T> = {
  data: T | undefined;
  updatedAt: number;
  promise?: Promise<T>;
};

const store = new Map<string, CacheEntry<unknown>>();
const listeners = new Map<string, Set<() => void>>();

/** Tempo (ms) em que o dado é considerado "fresco" — não revalida nesse período. */
const DEFAULT_STALE_TIME = 30_000;

function notify(key: string) {
  listeners.get(key)?.forEach((cb) => cb());
}

function subscribe(key: string, cb: () => void) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
    if (set!.size === 0) listeners.delete(key);
  };
}

export function getCached<T>(key: string): T | undefined {
  return store.get(key)?.data as T | undefined;
}

/** Escreve/atualiza o cache manualmente (ex.: após uma mutação otimista). */
export function setCached<T>(key: string, data: T) {
  const entry = store.get(key) ?? { data: undefined, updatedAt: 0 };
  entry.data = data;
  entry.updatedAt = Date.now();
  store.set(key, entry);
  notify(key);
}

/** Invalida (apaga) uma ou mais chaves — força novo fetch no próximo uso. */
export function invalidateCache(predicate?: (key: string) => boolean) {
  for (const key of Array.from(store.keys())) {
    if (!predicate || predicate(key)) {
      store.delete(key);
      notify(key);
    }
  }
}

type UseCachedOptions = {
  /** Quando false, não busca (ex.: enquanto não há token). */
  enabled?: boolean;
  staleTime?: number;
};

type UseCachedResult<T> = {
  data: T | undefined;
  /** true apenas no primeiro carregamento sem nada em cache. */
  loading: boolean;
  /** true durante revalidação em segundo plano (com dado em cache). */
  validating: boolean;
  error: string | null;
  /** Refaz o fetch ignorando o staleTime. */
  reload: () => Promise<void>;
  /** Atualiza o cache localmente sem ir ao servidor. */
  mutate: (data: T) => void;
};

/**
 * Busca `fetcher()` sob a chave `key`, servindo cache imediatamente e
 * revalidando em segundo plano quando o dado está velho.
 */
export function useCachedResource<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: UseCachedOptions = {},
): UseCachedResult<T> {
  const { enabled = true, staleTime = DEFAULT_STALE_TIME } = options;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [, forceRender] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const cached = key ? getCached<T>(key) : undefined;

  const runFetch = useCallback(
    async (force: boolean) => {
      if (!key || !enabled) return;
      const entry = store.get(key) as CacheEntry<T> | undefined;

      // Já existe uma requisição em voo para essa chave: reaproveita.
      if (entry?.promise) {
        try {
          await entry.promise;
        } catch {
          /* erro já tratado pelo dono da promise */
        }
        return;
      }

      const isFresh = entry && Date.now() - entry.updatedAt < staleTime;
      if (!force && entry?.data !== undefined && isFresh) return;

      setValidating(true);
      const promise = fetcherRef.current();
      store.set(key, {
        data: entry?.data,
        updatedAt: entry?.updatedAt ?? 0,
        promise,
      });

      try {
        const result = await promise;
        store.set(key, { data: result, updatedAt: Date.now() });
        setError(null);
        notify(key);
      } catch (err) {
        // Mantém o dado antigo (se houver) e limpa a promise em voo.
        const current = store.get(key) as CacheEntry<T> | undefined;
        store.set(key, { data: current?.data, updatedAt: current?.updatedAt ?? 0 });
        setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
        throw err;
      } finally {
        setValidating(false);
      }
    },
    [key, enabled, staleTime],
  );

  // Re-renderiza este componente quando a chave é atualizada por outra fonte.
  useEffect(() => {
    if (!key) return;
    return subscribe(key, () => forceRender((n) => n + 1));
  }, [key]);

  // Dispara o fetch ao montar / quando a chave muda.
  useEffect(() => {
    if (!key || !enabled) return;
    void runFetch(false).catch(() => {});
  }, [key, enabled, runFetch]);

  const reload = useCallback(async () => {
    await runFetch(true).catch(() => {});
  }, [runFetch]);

  const mutate = useCallback(
    (data: T) => {
      if (key) setCached(key, data);
    },
    [key],
  );

  return {
    data: cached,
    loading: cached === undefined && (validating || (enabled && !!key)),
    validating,
    error,
    reload,
    mutate,
  };
}
