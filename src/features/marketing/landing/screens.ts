/**
 * The four screens the product tour steps through: the tab label, the line of
 * copy under the tabs, and the fake URL each one shows in the mock's chrome.
 */

export type Screen = 'dashboard' | 'budget' | 'compare' | 'timeline';

/** The four steps, with the line of copy and the fake URL each one shows. */
export const SCREENS: {
  id: Screen;
  step: string;
  title: string;
  line: string;
  path: string;
}[] = [
  {
    id: 'dashboard',
    step: '01',
    title: 'The dashboard',
    line: 'Opens with the only thing that asks something of you — and every row is a link that carries its own filter.',
    path: '',
  },
  {
    id: 'budget',
    step: '02',
    title: 'Budget & payments',
    line: 'Budgeted, quoted, negotiated, actual, paid. The forecast is worked out by the database, in cents, never floats.',
    path: '/budget',
  },
  {
    id: 'compare',
    step: '03',
    title: 'Vendor comparison',
    line: 'Quotes side by side, question by question — money first, then what is included, logistics, and what could go wrong.',
    path: '/compare',
  },
  {
    id: 'timeline',
    step: '04',
    title: 'The day itself',
    line: 'Running order, vendor arrivals and every phone number in one place, with clashes flagged before the morning.',
    path: '/timeline',
  },
];

/** The width the mock is authored at. ProductSection scales it to fit. */
export const APP_WIDTH = 1240;
