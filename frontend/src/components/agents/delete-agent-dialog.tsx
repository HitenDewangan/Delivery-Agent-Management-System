'use client';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { useDeleteAgent } from '@/hooks/use-agents';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Agent } from '@/types/agent';

export function DeleteAgentDialog({
  agent,
  onClose,
  onDeleted,
}: {
  agent: Agent | null;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const deleteAgent = useDeleteAgent();

  const confirm = (e: React.MouseEvent) => {
    // Keep the dialog open while the request runs; we close it ourselves.
    e.preventDefault();
    if (!agent) return;
    deleteAgent.mutate(agent.id, {
      onSuccess: () => {
        toast.success(`${agent.fullName} was deleted`);
        onClose();
        onDeleted?.();
      },
      onError: (err) => {
        // 404 means someone else already removed it; the refreshed list will reflect that.
        toast.error(err instanceof ApiError ? err.message : 'Could not delete the agent');
        if (err instanceof ApiError && err.status === 404) onClose();
      },
    });
  };

  return (
    <AlertDialog
      open={agent !== null}
      onOpenChange={(open) => !open && !deleteAgent.isPending && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogTitle>Delete this agent?</AlertDialogTitle>
        <AlertDialogDescription>
          <span className="text-foreground font-medium">{agent?.fullName}</span> will be permanently
          removed. This action cannot be undone.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAgent.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={deleteAgent.isPending}
            className={cn(buttonVariants({ variant: 'destructive' }))}
          >
            {deleteAgent.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
