"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNotification } from "@/components/ui/notification-context";

type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type UseApiOptions = {
  errorTitle?: string;
  notifyOnError?: boolean;
};

/**
 * Generic hook for data-fetching pages. Eliminates the repeated
 * loading/error/notify pattern duplicated across 10+ page files.
 *
 * Usage:
 *   const { data, loading, error, reload } = useApi(
 *     (token) => api.getLeads(token),
 *     token
 *   );
 */
export function useApi<T>(
  fetcher: (token: string) => Promise<T>,
  token: string | undefined | null,
  options: UseApiOptions = {},
) {
  const { notify } = useNotification();
  const { errorTitle = "Erro ao carregar", notifyOnError = true } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    if (!token) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await fetcherRef.current(token);
      setState({ data: result, loading: false, error: null });
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : "Erro inesperado.";
      const displayMessage =
        status === 403
          ? "Você não tem permissão para acessar estes dados."
          : message;
      setState({ data: null, loading: false, error: displayMessage });
      if (notifyOnError) {
        notify({
          type: "error",
          title: status === 403 ? "Permissão negada" : errorTitle,
          message: displayMessage,
        });
      }
    }
  }, [token, errorTitle, notifyOnError, notify]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}

/**
 * Hook for mutations (create, update, delete). Provides loading and
 * automatic error notification without boilerplate in each page.
 *
 * Usage:
 *   const { execute, loading } = useMutation(
 *     () => api.createLead(token, payload),
 *     { successMessage: "Lead criado com sucesso!" }
 *   );
 */
export function useMutation<T = void>(
  options: {
    successMessage?: string;
    successTitle?: string;
    errorTitle?: string;
  } = {},
) {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (fn: () => Promise<T>): Promise<T | null> => {
      setLoading(true);
      try {
        const result = await fn();
        if (options.successMessage) {
          notify({
            type: "success",
            title: options.successTitle ?? "Concluído",
            message: options.successMessage,
          });
        }
        return result;
      } catch (err) {
        const status = (err as any)?.status;
        const message = err instanceof Error ? err.message : "Erro inesperado.";
        const displayMessage =
          status === 403 ? "Você não tem permissão para realizar esta ação." : message;
        notify({
          type: "error",
          title: status === 403 ? "Permissão negada" : (options.errorTitle ?? "Erro"),
          message: displayMessage,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [notify, options.successMessage, options.successTitle, options.errorTitle],
  );

  return { execute, loading };
}
