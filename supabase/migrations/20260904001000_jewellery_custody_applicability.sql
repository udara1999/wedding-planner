-- =============================================================================
-- 20260904001000  a switched-off piece needs no custodian
-- =============================================================================
-- A correction to v_jewellery_custody from 000900, before anything relies on
-- it. `overdue_return` already excluded not-applicable items — a piece that
-- was switched off was never borrowed, so it cannot be late back. `no_custodian`
-- did not, so switching a piece off left it in the "in nobody's hands" count
-- forever, which is a warning that cannot be acted on and therefore stops being
-- read.
--
-- applicability is also exposed, so a caller can say why a row is quiet rather
-- than having to join back to the table to find out.
-- =============================================================================

-- Dropped first: `create or replace view` can only append a column, not
-- insert one, and applicability goes in the middle where it reads. This is the
-- second time in this schema — 20260904000100 hit it too.
drop view if exists v_jewellery_custody;

create view v_jewellery_custody
with (security_invoker = true) as
select j.wedding_id,
       j.id                                   as item_id,
       j.name,
       j.subject,
       j.applicability,
       j.ownership,
       j.value_minor,
       j.deposit_minor,
       j.custodian,
       j.collect_on,
       j.return_by,
       j.returned_on,
       j.insured,
       (j.ownership in ('rented', 'borrowed') and j.returned_on is null) as awaiting_return,
       (j.ownership in ('rented', 'borrowed')
          and j.returned_on is null
          and (j.return_by is null or j.return_by < current_date)
          and j.applicability <> 'not_applicable')                       as overdue_return,
       -- Somebody has to be able to be asked. An item in nobody's custody is
       -- how a rented necklace goes missing between the venue and the shop —
       -- but only while the item is actually part of the wedding.
       ((j.custodian is null or btrim(j.custodian) = '')
          and j.applicability <> 'not_applicable')                       as no_custodian
  from jewellery_items j;

comment on view v_jewellery_custody is
  'Ticket 6.3. overdue_return covers a rental with no return date as well as '
  'one past it: nobody having decided when it goes back is the same problem '
  'later. Both warnings ignore not-applicable pieces — they were switched off, '
  'not lost, and a warning nobody can act on stops being read.';
