import { useOutletContext } from 'react-router-dom';
import type { MyWedding } from '../../types/db';
import { Card, CardBody, EmptyState } from '../../components/ui';

/**
 * Phase 0 placeholder. The real dashboard is Phase 7 and reads three views:
 *   v_wedding_financials · v_readiness · v_alerts
 * The KPI shells are here so the layout is settled before the data exists.
 */
export function DashboardPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();

  const kpis = [
    {
      label: 'Days to go',
      value: typeof wedding.days_to_go === 'number' ? String(wedding.days_to_go) : '—',
    },
    { label: 'Total budget', value: '—', phase: 2 },
    { label: 'Forecast final cost', value: '—', phase: 2 },
    { label: 'Paid so far', value: '—', phase: 2 },
    { label: 'Guests confirmed', value: '—', phase: 4 },
    { label: 'Tasks complete', value: '—', phase: 5 },
  ];

  return (
    <div className="px-6 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {wedding.bride_name} &amp; {wedding.groom_name}
          {wedding.wedding_date &&
            ` · ${new Date(wedding.wedding_date).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}`}
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardBody className="px-4 py-3">
              <p className="text-[11px] font-medium tracking-wide text-stone-500 uppercase">
                {k.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-wine-800">{k.value}</p>
              {k.phase && <p className="mt-0.5 text-[10px] text-stone-300">Phase {k.phase}</p>}
            </CardBody>
          </Card>
        ))}
      </div>

      <EmptyState
        title="Nothing to show yet"
        description="Phase 0 is complete: auth, tenancy and role-based access are working. The Attention Required panel arrives in Phase 7, once the budget, guest and task modules exist to feed it."
      />
    </div>
  );
}
