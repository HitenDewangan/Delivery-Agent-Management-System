'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/config';
import { cn } from '@/lib/utils';
import type { HealthResponse } from '@/types/health';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; health: HealthResponse }
  | { kind: 'unreachable'; message: string };

function Row({ label, up }: { label: string; up: boolean }) {
  const Icon = up ? CheckCircle2 : XCircle;
  return (
    <li className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-medium',
          up ? 'text-emerald-600' : 'text-destructive',
        )}
      >
        <Icon className="size-4" aria-hidden />
        {up ? 'Connected' : 'Unavailable'}
      </span>
    </li>
  );
}

async function fetchHealth(): Promise<State> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });
    const health = (await res.json()) as HealthResponse;
    return { kind: 'ready', health };
  } catch (err) {
    return { kind: 'unreachable', message: (err as Error).message };
  }
}

export function BackendStatus() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void fetchHealth().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    setState({ kind: 'loading' });
    setState(await fetchHealth());
  };

  return (
    <section
      aria-live="polite"
      className="bg-card w-full max-w-md rounded-xl border p-5 text-left shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">System status</h2>
        <Button variant="ghost" size="sm" onClick={() => void refresh()}>
          <RefreshCw className="size-3.5" aria-hidden /> Refresh
        </Button>
      </div>

      {state.kind === 'loading' && (
        <p className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Checking backend…
        </p>
      )}

      {state.kind === 'unreachable' && (
        <p className="text-destructive py-2 text-sm">
          Backend unreachable at {API_BASE_URL}. Is it running?
        </p>
      )}

      {state.kind === 'ready' && (
        <ul className="divide-y">
          <Row label="API" up />
          <Row label="PostgreSQL" up={state.health.dependencies.postgres === 'up'} />
          <Row label="Redis" up={state.health.dependencies.redis === 'up'} />
        </ul>
      )}
    </section>
  );
}
