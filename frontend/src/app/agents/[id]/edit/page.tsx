'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AgentForm } from '@/components/agents/agent-form';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState, ErrorState } from '@/components/layout/state-panels';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgent, useUpdateAgent } from '@/hooks/use-agents';
import { ApiError } from '@/lib/api';
import type { AgentPayload } from '@/types/agent';

export default function EditAgentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: agent, isPending, isError, error, refetch } = useAgent(id);
  const updateAgent = useUpdateAgent(id);

  const back = (
    <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
      <Link href={`/agents/${id}`}>
        <ArrowLeft className="size-4" aria-hidden /> Back to agent
      </Link>
    </Button>
  );

  if (isPending) {
    return (
      <>
        {back}
        <Skeleton
          aria-busy="true"
          aria-label="Loading agent"
          className="h-96 max-w-3xl rounded-xl"
        />
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
            <EmptyState title="Agent not found" description="This agent may have been deleted." />
          ) : (
            <ErrorState message={error.message} onRetry={() => void refetch()} />
          )}
        </Card>
      </>
    );
  }

  const onSubmit = async (payload: AgentPayload) => {
    await updateAgent.mutateAsync(payload);
    toast.success('Changes saved');
    router.push(`/agents/${id}`);
  };

  return (
    <>
      {back}
      <PageHeader title={`Edit ${agent.fullName}`} description="Update this agent's details." />
      <Card className="max-w-3xl">
        <CardContent>
          <AgentForm
            agent={agent}
            submitLabel="Save changes"
            cancelHref={`/agents/${id}`}
            onSubmit={onSubmit}
          />
        </CardContent>
      </Card>
    </>
  );
}
