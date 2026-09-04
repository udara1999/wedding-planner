import { Link } from 'react-router-dom';
import { CalendarDays, LogOut, Plus, Sparkles } from 'lucide-react';
import { useMyWeddings, useCreateDemoWedding } from './api';
import { useAuth } from '../auth/AuthProvider';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  InlineError,
  Page,
  PageHeader,
  Skeleton,
} from '../../components/ui';

const roleTone = {
  owner: 'gold',
  partner: 'gold',
  family: 'neutral',
  coordinator: 'neutral',
  viewer: 'neutral',
} as const;

export function WeddingListPage() {
  const { data, isLoading, error, refetch } = useMyWeddings();
  const demo = useCreateDemoWedding();
  const { signOut, user } = useAuth();

  return (
    <Page width="narrow">
      <PageHeader
        title="Your weddings"
        description={user?.email ?? undefined}
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={<LogOut className="size-4" />}
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        }
      />

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      )}
      {error && <ErrorState error={error} onRetry={() => void refetch()} />}

      {/* Ticket 9.3: "a populated dashboard in under 2 minutes". Creating an
          empty wedding cannot meet that however fast it is — seeding brings in
          93 unstarted tasks and every figure reads zero. So the second option
          exists, and it is offered as an equal rather than hidden as a demo
          link, because somebody deciding whether this is worth their evening
          needs to see it with something in it. */}
      {data && data.length === 0 && (
        <div className="space-y-4">
          <EmptyState
            icon={<CalendarDays className="size-5" />}
            title="No weddings yet"
            description="Start with your own, or look around one that is already filled in. You can invite your partner, family and coordinator afterwards."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link to="/new">
                  <Button icon={<Plus className="size-4" />}>Create a wedding</Button>
                </Link>
                <Button
                  variant="secondary"
                  icon={<Sparkles className="size-4" />}
                  loading={demo.isPending}
                  onClick={() => demo.mutate()}
                >
                  Show me a filled-in one
                </Button>
              </div>
            }
          />
          <div className="mx-auto max-w-md">
            <InlineError error={demo.error} />
            <p className="text-center text-xs text-stone-500">
              The example is a real wedding in your account with made-up details — vendors part
              booked, one payment overdue, some guests yet to reply. Change it, or delete it.
            </p>
          </div>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((w) => (
            <Link key={w.id} to={`/w/${w.id}`} className="focus-ring block rounded-xl">
              <Card className="hover:border-wine-200 hover:shadow-raised">
                <CardBody className="flex items-center justify-between gap-3 pt-5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-stone-900">
                      {w.bride_name || 'Bride'} &amp; {w.groom_name || 'Groom'}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-stone-500">
                      {w.wedding_date
                        ? new Date(w.wedding_date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Date not set'}
                      {typeof w.days_to_go === 'number' && w.days_to_go >= 0 && (
                        <span className="text-stone-500"> · {w.days_to_go} days to go</span>
                      )}
                    </p>
                  </div>
                  <Badge tone={roleTone[w.role]}>{w.role}</Badge>
                </CardBody>
              </Card>
            </Link>
          ))}

          <div className="pt-2">
            <Link to="/new">
              <Button variant="secondary" icon={<Plus className="size-4" />}>
                Create another wedding
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Page>
  );
}
