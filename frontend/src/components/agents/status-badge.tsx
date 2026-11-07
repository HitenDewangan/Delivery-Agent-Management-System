import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, type AgentStatus } from '@/types/agent';

export function StatusBadge({ status }: { status: AgentStatus }) {
  return (
    <Badge variant={status === 'ACTIVE' ? 'success' : 'muted'}>
      <span
        aria-hidden
        className={
          status === 'ACTIVE'
            ? 'size-1.5 rounded-full bg-emerald-500'
            : 'size-1.5 rounded-full bg-slate-400'
        }
      />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
