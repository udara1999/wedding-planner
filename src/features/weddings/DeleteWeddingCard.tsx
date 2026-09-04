import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useDeleteWedding } from './api';
import { Button, Card, CardBody, CardHeader, CardTitle, Modal } from '../../components/ui';

/**
 * The danger zone. Owner-only, and the caller is responsible for that gate —
 * weddings_delete is `using (app.is_owner(id))`, so showing this to a partner
 * would offer a button that silently does nothing (RLS filters the delete
 * rather than refusing it).
 */
export function DeleteWeddingCard({
  weddingId,
  coupleName,
}: {
  weddingId: string;
  coupleName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteWedding();

  return (
    <>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle>Delete this wedding</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-stone-600">
            Removes {coupleName} and everything planned under it — guests and RSVPs, budget,
            payments and gifts, vendors and their contracts, seating, tasks and the day-of schedule.
            Uploaded receipts and contract files are deleted too. Nothing is kept, and it cannot be
            undone.
          </p>
          <Button
            variant="danger"
            icon={<Trash2 className="size-4" />}
            onClick={() => setConfirming(true)}
          >
            Delete wedding
          </Button>
        </CardBody>
      </Card>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete this wedding?"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-700">
            All data for <strong>{coupleName}</strong> will be permanently removed. This cannot be
            undone.
          </p>

          {del.error && (
            <p className="text-sm text-red-700">
              {del.error instanceof Error ? del.error.message : 'Could not delete the wedding.'}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={del.isPending}>
              Cancel
            </Button>
            <Button variant="danger" loading={del.isPending} onClick={() => del.mutate(weddingId)}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
