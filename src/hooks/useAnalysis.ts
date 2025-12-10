import { useEffect, useRef, useState, useCallback } from 'react';
import ApiService from '../services/apiService';

// Type definition for Node.js Timer
type Timer = ReturnType<typeof setInterval>;

type AnalysisStatus = 'idle' | 'pending' | 'completed' | 'failed';

interface AnalysisState {
  status: AnalysisStatus;
  analysisId: string | null;
  result: any | null;
  error: string | null;
}

interface UseAnalysisOptions {
  pollingIntervalMs?: number;
  initialAnalysisId?: string | null;
}

export function useAnalysis(options: UseAnalysisOptions = {}): {
  state: AnalysisState;
  startImageAnalysis: (_imageFile: any, _params?: any) => Promise<void>;
  refresh: () => Promise<void>;
  cancel: () => void;
} {
  const { pollingIntervalMs = 2500, initialAnalysisId = null } = options;

  const [state, setState] = useState<AnalysisState>({
    status: initialAnalysisId ? 'pending' : 'idle',
    analysisId: initialAnalysisId,
    result: null,
    error: null,
  });

  const pollingRef = useRef<Timer | null>(null);

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollResult = useCallback(async (analysisId: string) => {
    try {
      const res = await ApiService.getAnalysisResult(analysisId);
      
      // Подстрой под реальную структуру ответа API
      // Предполагаем, что API возвращает { status, data, ... }
      const status = res.status || res.data?.status || 'PENDING';
      const data = res.data || res;

      if (status === 'COMPLETED' || status === 'SUCCESS') {
        clearPolling();
        setState((prev) => ({
          ...prev,
          status: 'completed',
          result: data,
        }));
      } else if (status === 'FAILED' || status === 'ERROR') {
        clearPolling();
        setState((prev) => ({
          ...prev,
          status: 'failed',
          error: data?.error || 'Analysis failed',
        }));
      }
      // Если статус PENDING или PROCESSING - продолжаем polling
    } catch (error: any) {
      console.error('[useAnalysis] pollResult error', error);
      // Не сразу считаем это fail - подождём ещё пару попыток
      // Можно добавить счётчик ошибок и fail только после N подряд идущих ошибок
    }
  }, [clearPolling]);

  const startPolling = useCallback((analysisId: string) => {
    clearPolling();

    // Первый запрос сразу
    pollResult(analysisId);

    // Затем polling с интервалом
    pollingRef.current = setInterval(() => {
      pollResult(analysisId);
    }, pollingIntervalMs);
  }, [pollingIntervalMs, pollResult, clearPolling]);

  const startImageAnalysis = async (imageFile: any, params?: any) => {
    try {
      setState({
        status: 'pending',
        analysisId: null,
        result: null,
        error: null,
      });

      const response = await ApiService.analyzeImage(imageFile, params?.locale);
      
      // Подстрой под реальный ответ API
      // Предполагаем, что API возвращает { analysisId, ... } или { id, ... }
      const analysisId = response.analysisId || response.id || response.data?.analysisId || response.data?.id;

      if (!analysisId) {
        throw new Error('No analysisId returned from API');
      }

      setState((prev) => ({
        ...prev,
        status: 'pending',
        analysisId,
      }));

      startPolling(analysisId);
    } catch (error: any) {
      console.error('[useAnalysis] startImageAnalysis error', error);
      setState({
        status: 'failed',
        analysisId: null,
        result: null,
        error: error?.message || 'Failed to start analysis',
      });
    }
  };

  const refresh = async () => {
    if (!state.analysisId) return;
    await pollResult(state.analysisId);
  };

  const cancel = () => {
    clearPolling();
    setState({
      status: 'idle',
      analysisId: null,
      result: null,
      error: null,
    });
  };

  // Если есть initialAnalysisId, начинаем polling сразу
  useEffect(() => {
    if (initialAnalysisId && state.status === 'pending' && !pollingRef.current) {
      startPolling(initialAnalysisId);
    }
  }, [initialAnalysisId, state.status, startPolling]);

  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  return {
    state,
    startImageAnalysis,
    refresh,
    cancel,
  };
}

