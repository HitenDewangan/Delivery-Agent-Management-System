import * as React from 'react';
import { cn } from '@/lib/utils';

const fieldBase =
  'border-input bg-card placeholder:text-muted-foreground focus-visible:ring-ring/40 focus-visible:border-ring w-full rounded-md border px-3 text-sm shadow-xs transition-colors outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20';

function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return <input type={type} className={cn(fieldBase, 'h-9 py-1', className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldBase, 'min-h-24 py-2', className)} {...props} />;
}

// Native <select>: fully accessible, great on mobile, no extra dependency.
function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select className={cn(fieldBase, 'h-9 py-1 pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export { Input, Textarea, Select };
