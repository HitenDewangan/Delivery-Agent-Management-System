'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import {
  AGENT_STATUSES,
  STATUS_LABELS,
  VEHICLE_LABELS,
  VEHICLE_TYPES,
  type Agent,
  type AgentPayload,
} from '@/types/agent';

// Mirrors the backend rules so users get instant feedback. The backend stays authoritative.
const formSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters')
    .max(100, 'Keep it under 100 characters'),
  phone: z
    .string()
    .trim()
    .refine((v) => /^\+?[\d\s\-().]+$/.test(v) && /^\d{7,15}$/.test(v.replace(/\D/g, '')), {
      message: 'Enter a valid phone number (7-15 digits, optional leading +)',
    }),
  email: z.email('Enter a valid email address'),
  serviceArea: z.string().trim().min(2, 'Enter at least 2 characters').max(100),
  status: z.enum(AGENT_STATUSES),
  vehicleType: z.enum([...VEHICLE_TYPES, '']),
  notes: z.string().max(1000, 'Keep notes under 1000 characters'),
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = {
  fullName: '',
  phone: '',
  email: '',
  serviceArea: '',
  status: 'ACTIVE',
  vehicleType: '',
  notes: '',
};

function toFormValues(agent?: Agent): FormValues {
  if (!agent) return EMPTY;
  return {
    fullName: agent.fullName,
    phone: agent.phone,
    email: agent.email,
    serviceArea: agent.serviceArea,
    status: agent.status,
    vehicleType: agent.vehicleType ?? '',
    notes: agent.notes ?? '',
  };
}

function toPayload(values: FormValues): AgentPayload {
  return {
    fullName: values.fullName,
    phone: values.phone,
    email: values.email,
    serviceArea: values.serviceArea,
    status: values.status,
    vehicleType: values.vehicleType === '' ? null : values.vehicleType,
    notes: values.notes.trim() === '' ? null : values.notes,
  };
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export function AgentForm({
  agent,
  submitLabel,
  cancelHref,
  onSubmit,
}: {
  agent?: Agent;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (payload: AgentPayload) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(agent),
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toPayload(values));
    } catch (err) {
      if (!(err instanceof ApiError)) {
        toast.error('Unexpected error. Please try again.');
        return;
      }
      // Show server-side problems next to the offending fields.
      const known = new Set<string>(Object.keys(EMPTY));
      let mapped = false;
      for (const issue of err.fieldIssues) {
        if (known.has(issue.field)) {
          setError(issue.field as keyof FormValues, { message: issue.message });
          mapped = true;
        }
      }
      for (const field of err.conflictFields) {
        if (known.has(field)) {
          setError(field as keyof FormValues, { message: `This ${field} is already in use` });
          mapped = true;
        }
      }
      toast.error(mapped ? 'Please fix the highlighted fields.' : err.message);
    }
  });

  const invalid = (name: keyof FormValues) => (errors[name] ? true : undefined);

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="fullName" label="Full name" error={errors.fullName?.message}>
          <Input
            id="fullName"
            autoComplete="off"
            aria-invalid={invalid('fullName')}
            {...register('fullName')}
          />
        </Field>
        <Field id="serviceArea" label="Service area" error={errors.serviceArea?.message}>
          <Input
            id="serviceArea"
            aria-invalid={invalid('serviceArea')}
            {...register('serviceArea')}
          />
        </Field>
        <Field
          id="phone"
          label="Phone"
          error={errors.phone?.message}
          hint="Example: +91 98765 43210"
        >
          <Input id="phone" type="tel" aria-invalid={invalid('phone')} {...register('phone')} />
        </Field>
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input id="email" type="email" aria-invalid={invalid('email')} {...register('email')} />
        </Field>
        <Field id="status" label="Status" error={errors.status?.message}>
          <Select id="status" {...register('status')}>
            {AGENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="vehicleType" label="Vehicle (optional)" error={errors.vehicleType?.message}>
          <Select id="vehicleType" {...register('vehicleType')}>
            <option value="">Not specified</option>
            {VEHICLE_TYPES.map((v) => (
              <option key={v} value={v}>
                {VEHICLE_LABELS[v]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="notes" label="Notes (optional)" error={errors.notes?.message}>
        <Textarea id="notes" rows={4} aria-invalid={invalid('notes')} {...register('notes')} />
      </Field>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
