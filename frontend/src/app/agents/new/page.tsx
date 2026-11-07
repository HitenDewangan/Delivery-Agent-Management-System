'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AgentForm } from '@/components/agents/agent-form';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useCreateAgent } from '@/hooks/use-agents';
import type { AgentPayload } from '@/types/agent';

export default function NewAgentPage() {
  const router = useRouter();
  const createAgent = useCreateAgent();

  const onSubmit = async (payload: AgentPayload) => {
    const agent = await createAgent.mutateAsync(payload);
    toast.success(`${agent.fullName} was added`);
    router.push(`/agents/${agent.id}`);
  };

  return (
    <>
      <PageHeader title="Add agent" description="Create a new delivery agent record." />
      <Card className="max-w-3xl">
        <CardContent>
          <AgentForm submitLabel="Create agent" cancelHref="/agents" onSubmit={onSubmit} />
        </CardContent>
      </Card>
    </>
  );
}
