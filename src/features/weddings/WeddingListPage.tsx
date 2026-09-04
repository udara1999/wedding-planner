import { Link } from 'react-router-dom';
import { CalendarDays, LogOut, Plus } from 'lucide-react';
import { useMyWeddings } from './api';
import { useAuth } from '../auth/AuthProvider';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
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

      {data && data.length === 0 && (
        <EmptyState
          icon={<CalendarDays className="size-5" />}
          title="No weddings yet"
          description="Create one to get started. You will be able to invite your partner, family and coordinator afterwards."
          action={
            <Link to="/new">
              <Button icon={<Plus className="size-4" />}>Create a wedding</Button>
            </Link>
          }
        />
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
                        <span className="text-stone-400"> · {w.days_to_go} days to go</span>
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
