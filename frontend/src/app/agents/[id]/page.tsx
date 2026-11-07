'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { DeleteAgentDialog } from '@/components/agents/delete-agent-dialog';
import { StatusBadge } from '@/components/agents/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState, ErrorState } from '@/components/layout/state-panels';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgent } from '@/hooks/use-agents';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { VEHICLE_LABELS } from '@/types/agent';

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className="mt-1 text-sm break-words">{children}</dd>
    </div>
  );
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: agent, isPending, isError, error, refetch } = useAgent(id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const back = (
    <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
      <Link href="/agents">
        <ArrowLeft className="size-4" aria-hidden /> All agents
      </Link>
    </Button>
  );

  if (isPending) {
    return (
      <>
        {back}
        <div aria-busy="true" aria-label="Loading agent" className="grid gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-72 max-w-3xl rounded-xl" />
        </div>
      </>
    );
  }

  if (isError) {
    const missing = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <>
        {back}
        <Card className="max-w-3xl">
          {missing ? (
            <EmptyState
              title="Agent not found"
              description="This agent may have been deleted, or the link is incorrect."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/agents">Back to agents</Link>
                </Button>
              }
            />
          ) : (
            <ErrorState message={error.message} onRetry={() => void refetch()} />
          )}
        </Card>
      </>
    );
  }

  return (
    <>
      {back}
      <PageHeader
        title={agent.fullName}
        description={agent.email}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/agents/${agent.id}/edit`}>
                <Pencil className="size-4" aria-hidden /> Edit
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="size-4" aria-hidden /> Delete
            </Button>
          </>
        }
      />
      <Card className="max-w-3xl">
        <CardContent>
          <dl className="grid gap-6 sm:grid-cols-2">
            <Detail label="Status">
              <StatusBadge status={agent.status} />
            </Detail>
            <Detail label="Service area">{agent.serviceArea}</Detail>
            <Detail label="Phone">{agent.phone}</Detail>
            <Detail label="Email">{agent.email}</Detail>
            <Detail label="Vehicle">
              {agent.vehicleType ? VEHICLE_LABELS[agent.vehicleType] : 'Not specified'}
            </Detail>
            <Detail label="Agent ID">
              <span className="font-mono text-xs">{agent.id}</span>
            </Detail>
            <div className="sm:col-span-2">
              <Detail label="Notes">
                {agent.notes ? (
                  <span className="whitespace-pre-wrap">{agent.notes}</span>
                ) : (
                  <span className="text-muted-foreground">No notes</span>
                )}
              </Detail>
            </div>
            <Detail label="Created">{formatDateTime(agent.createdAt)}</Detail>
            <Detail label="Last updated">{formatDateTime(agent.updatedAt)}</Detail>
          </dl>
        </CardContent>
      </Card>

      <DeleteAgentDialog
        agent={confirmOpen ? agent : null}
        onClose={() => setConfirmOpen(false)}
        onDeleted={() => router.push('/agents')}
      />
    </>
  );
}
