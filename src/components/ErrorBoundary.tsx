import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { report } from '../lib/observability';
import { Button, Card, CardBody } from './ui';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Ticket 9.5. The last thing between a render error and a white screen.
 *
 * A white screen on a wedding planner three weeks before the wedding is the
 * worst failure this app has, because there is nothing on it to tell somebody
 * whether their data is gone. So this says plainly that the data is safe, and
 * offers the two things that actually help: reload, or go back to the list and
 * try another wedding.
 *
 * Still a class component. Error boundaries are the one thing hooks cannot do.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    report({
      severity: 'error',
      code: 'react.render',
      message: error.message,
      context: {
        // The component stack, not the props. Props on this app's screens hold
        // guest names and budget figures.
        stack: (info.componentStack ?? '').split('\n').slice(0, 8).join('\n'),
      },
    });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-full items-center justify-center bg-ivory p-6">
        <Card className="w-full max-w-lg shadow-raised">
          <CardBody className="space-y-4 py-8 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-stone-900">
                This screen stopped working
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Nothing has been lost — everything you have entered is saved on the server, not in
                this page. Reloading almost always fixes it.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button
                icon={<RotateCcw className="size-4" />}
                onClick={() => window.location.reload()}
              >
                Reload
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                Back to your weddings
              </Button>
            </div>

            {import.meta.env.DEV && (
              <pre className="scroll-subtle max-h-40 overflow-auto rounded-lg bg-stone-50 p-3 text-left text-[11px] text-stone-600">
                {error.stack ?? error.message}
              </pre>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }
}
