-- =============================================================================
-- 2200  decision write-back  (ticket 3.6)
-- =============================================================================
-- "Choosing an option offers one-click creation of the vendors row."
--
-- One RPC rather than two client calls. Creating the vendor and recording the
-- decision that points at it are one fact, and doing them separately leaves a
-- half state on any failure: a vendor nobody chose, or a decision claiming a
-- vendor row that was never written.
-- =============================================================================

create or replace function public.record_vendor_from_option(p_option_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_option   vendor_options;
  v_label    text;
  v_vendor   uuid;
begin
  select * into v_option from vendor_options where id = p_option_id;
  if v_option.id is null then
    raise exception 'Option not found';
  end if;

  -- `is not true`, not `not`: these helpers returned NULL for a non-member
  -- once, and `not NULL` is NULL, which skips the raise entirely.
  if app.can_write(v_option.wedding_id) is not true then
    raise exception 'Only the couple can record a vendor';
  end if;

  -- The readable category name, falling back to the key for a category that
  -- has no questions of its own.
  select min(category_label) into v_label
    from template.vendor_questions
   where category_key = v_option.category_key;

  insert into vendors (wedding_id, category, name, contact_name, phone, package,
                       quoted_minor, negotiated_minor, deposit_paid_minor,
                       status, rating, notes)
  values (v_option.wedding_id,
          coalesce(v_label, v_option.category_key),
          coalesce(nullif(v_option.vendor_name, ''), v_option.label),
          v_option.contact_name,
          v_option.phone,
          v_option.package,
          v_option.quoted_minor,
          v_option.negotiated_minor,
          v_option.deposit_minor,
          -- Not 'confirmed': choosing a shortlisted option is a decision, not a
          -- signed contract. The pipeline moves on from here by hand.
          'tentatively_booked',
          v_option.rating,
          'Recorded from the comparison, option ' || v_option.label)
  returning id into v_vendor;

  insert into vendor_decisions (wedding_id, category_key, chosen_option_id,
                                decided_on, recorded_vendor_id)
  values (v_option.wedding_id, v_option.category_key, v_option.id,
          current_date, v_vendor)
  on conflict (wedding_id, category_key) do update
     set chosen_option_id   = excluded.chosen_option_id,
         -- Keep the original decision date if there already was one: recording
         -- the vendor later does not move when the choice was made.
         decided_on         = coalesce(vendor_decisions.decided_on, excluded.decided_on),
         recorded_vendor_id = excluded.recorded_vendor_id;

  return v_vendor;
end;
$$;

revoke all on function public.record_vendor_from_option(uuid) from public, anon;
grant execute on function public.record_vendor_from_option(uuid) to authenticated;

comment on function public.record_vendor_from_option(uuid) is
  'Ticket 3.6. Creates the vendors row for a chosen option and points the '
  'decision at it, in one transaction.';
