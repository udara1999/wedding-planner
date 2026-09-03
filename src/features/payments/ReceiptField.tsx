import { useState } from 'react';
import { signedReceiptUrl, useRemoveReceipt, useUploadReceipt } from './api';
import { Button } from '../../components/ui';

/**
 * Ticket 2.10. Attached to a payment that already exists, because the object
 * key contains the payment id — there is nowhere to put a file before the row
 * it belongs to has been saved.
 */
export function ReceiptField({
  weddingId,
  paymentId,
  receiptPath,
  canEdit,
}: {
  weddingId: string;
  paymentId: string;
  receiptPath: string | null;
  canEdit: boolean;
}) {
  const upload = useUploadReceipt(weddingId);
  const remove = useRemoveReceipt(weddingId);
  const [problem, setProblem] = useState<string | null>(null);

  async function open() {
    if (!receiptPath) return;
    setProblem(null);
    try {
      window.open(await signedReceiptUrl(receiptPath), '_blank', 'noopener');
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not open the receipt');
    }
  }

  return (
    <div className="space-y-1.5">
      {receiptPath ? (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void open()}>
            View receipt
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate({ paymentId, path: receiptPath })}
            >
              {remove.isPending ? 'Removing…' : 'Remove'}
            </Button>
          )}
        </div>
      ) : (
        canEdit && (
          <input
            type="file"
            accept="image/*,application/pdf"
            disabled={upload.isPending}
            className="block w-full text-xs text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-xs file:text-stone-700 hover:file:bg-stone-200"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate({ paymentId, file });
            }}
          />
        )
      )}

      {upload.isPending && <p className="text-xs text-stone-500">Uploading…</p>}
      {(upload.error ?? remove.error ?? problem) && (
        <p className="text-xs text-red-700">
          {problem ??
            ((upload.error ?? remove.error) instanceof Error
              ? (upload.error ?? remove.error)!.message
              : 'Something went wrong')}
        </p>
      )}
    </div>
  );
}
