import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateWedding } from './api';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
} from '../../components/ui';
import { TRADITIONS } from './traditions';

const schema = z.object({
  brideName: z.string().min(1, "The bride's name is required"),
  groomName: z.string().min(1, "The groom's name is required"),
  weddingDate: z
    .string()
    .min(1, 'Pick a date — every task and countdown item is dated from it')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Not a valid date'),
  currency: z.string().length(3),
  timezone: z.string().min(1),
  tradition: z.string().min(1, 'Pick a tradition'),
});

type FormValues = z.infer<typeof schema>;

export function CreateWeddingPage() {
  const navigate = useNavigate();
  const create = useCreateWedding();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'LKR', timezone: 'Asia/Colombo', tradition: 'poruwa' },
  });

  async function onSubmit(values: FormValues) {
    const id = await create.mutateAsync(values);
    navigate(`/w/${id}`);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link to="/" className="text-sm text-stone-500 hover:text-stone-800">
        ← Back
      </Link>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Create a wedding</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bride's name" error={errors.brideName?.message}>
                <Input placeholder="Methuli" {...register('brideName')} />
              </Field>
              <Field label="Groom's name" error={errors.groomName?.message}>
                <Input placeholder="Udara" {...register('groomName')} />
              </Field>
            </div>

            <Field
              label="Wedding date"
              error={errors.weddingDate?.message}
              hint="Everything else is dated from this. You can change it later and the whole plan re-dates."
            >
              <Input type="date" {...register('weddingDate')} />
            </Field>

            <Field
              label="Tradition"
              error={errors.tradition?.message}
              hint="Chooses which checklists, tasks and timeline the plan is seeded from."
            >
              <Select {...register('tradition')}>
                {TRADITIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Currency" error={errors.currency?.message}>
                <Input maxLength={3} {...register('currency')} />
              </Field>
              <Field label="Timezone" error={errors.timezone?.message}>
                <Input {...register('timezone')} />
              </Field>
            </div>

            {create.error && (
              <p className="text-xs text-red-700">
                {create.error instanceof Error ? create.error.message : 'Could not create'}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create wedding'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
