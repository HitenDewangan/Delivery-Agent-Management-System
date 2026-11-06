import { Truck } from 'lucide-react';
import { BackendStatus } from '@/components/backend-status';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl">
          <Truck className="size-6" aria-hidden />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Delivery Agent Management</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Frontend is running. Phase 1 foundation is in place; the admin dashboard arrives in later
          phases.
        </p>
      </div>
      <BackendStatus />
    </main>
  );
}
