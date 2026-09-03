import { Link } from 'react-router-dom';
import { useMyWeddings } from './api';
import { useAuth } from '../auth/AuthProvider';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Spinner,
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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Your weddings</h1>
          <p className="mt-0.5 text-sm text-stone-500">{user?.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          Sign out
        </Button>
      </header>

      {isLoading && <Spinner label="Loading your weddings" />}
      {error && <ErrorState error={error} onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No weddings yet"
          description="Create one to get started. You will be able to invite your partner, family and coordinator afterwards."
          action={
            <Link to="/new">
              <Button>Create a wedding</Button>
            </Link>
          }
        />
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((w) => (
            <Link key={w.id} to={`/w/${w.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardBody className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-stone-900">
                      {w.bride_name || 'Bride'} &amp; {w.groom_name || 'Groom'}
                    </p>
                    <p className="mt-0.5 text-sm text-stone-500">
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
              <Button variant="secondary">Create another wedding</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
