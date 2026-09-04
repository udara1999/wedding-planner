import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInvitations, useInviteMember, useMembers, useRevokeInvitation } from './api';
import type { MemberRole, MyWedding, WeddingSide } from '../../types/db';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorState,
  Field,
  Input,
  Page,
  PageHeader,
  Select,
  Spinner,
} from '../../components/ui';

const ROLE_HELP: Record<Exclude<MemberRole, 'owner'>, string> = {
  partner: 'Full access to everything, same as you.',
  family: 'Can see the plan and the money, but only guests on their side of the family.',
  coordinator: 'Day-of only — timeline, vendor schedule, contacts. No access to any money.',
  viewer: 'Read-only across the plan.',
};

const schema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    role: z.enum(['partner', 'family', 'coordinator', 'viewer']),
    side: z.enum(['bride', 'groom', 'both']).optional().nullable(),
  })
  .refine((v) => v.role !== 'family' || Boolean(v.side), {
    message: 'Pick which side of the family they belong to',
    path: ['side'],
  });

type FormValues = z.infer<typeof schema>;

export function MembersPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const { data, isLoading, error, refetch } = useMembers(wedding.id);
  const invite = useInviteMember(wedding.id);
  const invitations = useInvitations(wedding.id);
  const revoke = useRevokeInvitation(wedding.id);
  const [link, setLink] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'partner', side: null },
  });
  const role = form.watch('role');

  async function onSubmit(values: FormValues) {
    const token = await invite.mutateAsync({
      email: values.email,
      role: values.role,
      side: (values.side ?? null) as WeddingSide | null,
    });
    setLink(`${window.location.origin}/invite?token=${token}`);
    form.reset({ role: 'partner', side: null, email: '' });
  }

  return (
    <Page width="default">
      <PageHeader title="People" description="Who can see this wedding, and how much of it." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invite someone</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Email address" error={form.formState.errors.email?.message}>
              <Input type="email" placeholder="name@example.com" {...form.register('email')} />
            </Field>

            <Field label="Access level" error={form.formState.errors.role?.message}>
              <Select {...form.register('role')}>
                <option value="partner">Partner</option>
                <option value="family">Family member</option>
                <option value="coordinator">Coordinator</option>
                <option value="viewer">Viewer</option>
              </Select>
            </Field>

            <p className="rounded-md bg-stone-50 px-3 py-2 text-xs text-stone-600">
              {ROLE_HELP[role]}
            </p>

            {role === 'family' && (
              <Field label="Side of the family" error={form.formState.errors.side?.message}>
                <Select {...form.register('side')}>
                  <option value="">Choose…</option>
                  <option value="bride">Bride&apos;s side</option>
                  <option value="groom">Groom&apos;s side</option>
                  <option value="both">Both</option>
                </Select>
              </Field>
            )}

            {invite.error && (
              <p className="text-xs text-red-700">
                {invite.error instanceof Error ? invite.error.message : 'Could not invite'}
              </p>
            )}

            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? 'Creating invitation…' : 'Create invitation link'}
            </Button>
          </form>

          {link && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-medium text-green-900">
                Invitation created — send them this link
              </p>
              <div className="mt-2 flex gap-2">
                <Input readOnly value={link} className="text-xs" />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void navigator.clipboard.writeText(link)}
                >
                  Copy
                </Button>
              </div>
              <p className="mt-2 text-xs sm:text-[11px] text-green-800">
                Emailing this automatically arrives in Phase 4.10.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
        </CardHeader>
        <CardBody>
          {invitations.isLoading && <Spinner />}
          {invitations.error && (
            <ErrorState error={invitations.error} onRetry={() => void invitations.refetch()} />
          )}
          {invitations.data?.length === 0 && (
            <p className="text-sm text-stone-500">Nobody is waiting to accept an invitation.</p>
          )}
          {invitations.data && invitations.data.length > 0 && (
            <ul className="divide-y divide-stone-100">
              {invitations.data.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-stone-800">{inv.email}</p>
                    <p className="text-xs text-stone-500">
                      {inv.side ? `${inv.role} · ${inv.side} side` : inv.role}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone="warn">pending</Badge>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={revoke.isPending}
                      onClick={() => revoke.mutate(inv.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {revoke.error && (
            <p className="mt-3 text-xs text-red-700">
              {revoke.error instanceof Error ? revoke.error.message : 'Could not revoke'}
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current people</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading && <Spinner />}
          {error && <ErrorState error={error} onRetry={() => void refetch()} />}
          {data && (
            <ul className="divide-y divide-stone-100">
              {data.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-stone-600">{m.user_id}</p>
                    {m.side && <p className="text-xs text-stone-500">{m.side} side</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {!m.accepted_at && <Badge tone="warn">pending</Badge>}
                    <Badge tone={m.role === 'coordinator' ? 'neutral' : 'gold'}>{m.role}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </Page>
  );
}
