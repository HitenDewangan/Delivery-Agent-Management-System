'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { DeleteAgentDialog } from '@/components/agents/delete-agent-dialog';
import { StatusBadge } from '@/components/agents/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState, ErrorState } from '@/components/layout/state-panels';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAgents } from '@/hooks/use-agents';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  AGENT_STATUSES,
  STATUS_LABELS,
  VEHICLE_LABELS,
  type Agent,
  type AgentStatus,
} from '@/types/agent';

const PAGE_SIZE = 10;

function RowsSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="mb-1.5 h-4 w-36" />
            <Skeleton className="h-3 w-44" />
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell className="hidden lg:table-cell">
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="ml-auto h-8 w-24" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function AgentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AgentStatus | ''>('');
  const [area, setArea] = useState('');
  const [toDelete, setToDelete] = useState<Agent | null>(null);

  const debouncedSearch = useDebouncedValue(search.trim());
  const debouncedArea = useDebouncedValue(area.trim());
  const filtersActive = Boolean(search || status || area);

  const { data, isPending, isError, error, isFetching, refetch } = useAgents({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    status,
    serviceArea: debouncedArea,
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setArea('');
    setPage(1);
  };

  const first =
    pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const last = pagination ? first + items.length - (items.length > 0 ? 1 : 0) : 0;

  return (
    <>
      <PageHeader
        title="Agents"
        description="Search, filter and manage your delivery agents."
        actions={
          <Button asChild>
            <Link href="/agents/new">
              <Plus className="size-4" aria-hidden /> Add agent
            </Link>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-[1fr_180px_200px_auto]">
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              aria-label="Search agents"
              placeholder="Search name, email, phone…"
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as AgentStatus | '');
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {AGENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Input
            aria-label="Filter by service area"
            placeholder="Service area"
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setPage(1);
            }}
          />
          <Button variant="ghost" onClick={clearFilters} disabled={!filtersActive}>
            Clear
          </Button>
        </div>

        {isError ? (
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        ) : !isPending && items.length === 0 ? (
          filtersActive ? (
            <EmptyState
              title="No matching agents"
              description="Try a different search or clear your filters."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No agents yet"
              description="Add your first delivery agent to get started."
              action={
                <Button asChild>
                  <Link href="/agents/new">Add agent</Link>
                </Button>
              }
            />
          )
        ) : (
          <Table aria-busy={isPending || isFetching}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Agent</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="hidden md:table-cell">Service area</TableHead>
                <TableHead className="hidden lg:table-cell">Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              className={isFetching && !isPending ? 'opacity-60 transition-opacity' : undefined}
            >
              {isPending ? (
                <RowsSkeleton />
              ) : (
                items.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <Link href={`/agents/${agent.id}`} className="font-medium hover:underline">
                        {agent.fullName}
                      </Link>
                      <p className="text-muted-foreground text-xs">{agent.email}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{agent.phone}</TableCell>
                    <TableCell className="hidden md:table-cell">{agent.serviceArea}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {agent.vehicleType ? VEHICLE_LABELS[agent.vehicleType] : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={agent.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label={`View ${agent.fullName}`}
                        >
                          <Link href={`/agents/${agent.id}`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${agent.fullName}`}
                        >
                          <Link href={`/agents/${agent.id}/edit`}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${agent.fullName}`}
                          className="text-destructive hover:text-destructive"
                          onClick={() => setToDelete(agent)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {pagination && pagination.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t p-4 text-sm sm:flex-row">
            <p className="text-muted-foreground">
              Showing {first}–{last} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="size-4" aria-hidden /> Previous
              </Button>
              <span className="text-muted-foreground px-1 tabular-nums">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <DeleteAgentDialog
        agent={toDelete}
        onClose={() => setToDelete(null)}
        // Deleting the last row of a later page would leave an empty page; step back.
        onDeleted={() => items.length === 1 && page > 1 && setPage((p) => p - 1)}
      />
    </>
  );
}
