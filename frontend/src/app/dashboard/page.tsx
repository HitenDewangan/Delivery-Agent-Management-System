'use client';

import Link from 'next/link';
import { Plus, UserCheck, UserX, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState, ErrorState } from '@/components/layout/state-panels';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgentStats } from '@/hooks/use-agents';
import { VEHICLE_LABELS, type AgentStats } from '@/types/agent';

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={`flex size-11 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="size-5" aria-hidden />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BarList({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="grid gap-3">
      {rows.map((row) => (
        <li key={row.label} className="grid gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate">{row.label}</span>
            <span className="text-muted-foreground tabular-nums">{row.count}</span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading statistics">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

function Breakdowns({ stats }: { stats: AgentStats }) {
  const areas = stats.byServiceArea.map((r) => ({ label: r.serviceArea, count: r.count }));
  const vehicles = stats.byVehicleType.map((r) => ({
    label: r.vehicleType ? VEHICLE_LABELS[r.vehicleType] : 'Not specified',
    count: r.count,
  }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Top service areas</CardTitle>
          <CardDescription>Areas with the most agents</CardDescription>
        </CardHeader>
        <CardContent>
          <BarList rows={areas} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Agents by vehicle</CardTitle>
          <CardDescription>How your fleet gets around</CardDescription>
        </CardHeader>
        <CardContent>
          <BarList rows={vehicles} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isPending, isError, error, refetch } = useAgentStats();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A snapshot of your delivery agents."
        actions={
          <Button asChild>
            <Link href="/agents/new">
              <Plus className="size-4" aria-hidden /> Add agent
            </Link>
          </Button>
        }
      />
      {isPending && <DashboardSkeleton />}
      {isError && (
        <Card>
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        </Card>
      )}
      {stats && stats.total === 0 && (
        <Card>
          <EmptyState
            title="No agents yet"
            description="Add your first delivery agent to start seeing statistics here."
            action={
              <Button asChild>
                <Link href="/agents/new">Add agent</Link>
              </Button>
            }
          />
        </Card>
      )}
      {stats && stats.total > 0 && (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total agents"
              value={stats.total}
              icon={Users}
              tone="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              label="Active"
              value={stats.active}
              icon={UserCheck}
              tone="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="Inactive"
              value={stats.inactive}
              icon={UserX}
              tone="bg-slate-100 text-slate-600"
            />
          </div>
          <Breakdowns stats={stats} />
        </div>
      )}
    </>
  );
}
