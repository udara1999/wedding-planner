import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

/**
 * The page navigates on submit rather than posting anywhere, so the assertion
 * worth making is what it navigates WITH. Mocking the hook is what makes that
 * observable without mounting the whole authenticated app behind a route.
 */
const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

/**
 * Renders the landing page the way the browser does, which the prerender test
 * does not: prerendering runs renderToStaticMarkup, so it never mounts an
 * effect, never observes anything and never clicks a tab.
 *
 * That gap is the whole reason this file exists. The page reaches for four
 * browser APIs on mount — IntersectionObserver, matchMedia, document.fonts and
 * requestAnimationFrame — and jsdom has some of them and not others, which is
 * a fair approximation of the range of real browsers. Anything that throws in
 * an effect here would take the entire page down with it in production, after
 * the prerendered markup had already painted and looked fine.
 */

afterEach(() => {
  cleanup();
  navigate.mockClear();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe('LandingPage in a browser', () => {
  it('mounts without an IntersectionObserver, leaving content visible', () => {
    // jsdom has no IntersectionObserver. The reveal hook must notice and leave
    // the page alone rather than hiding every element with nothing left to
    // un-hide it — which would be a blank page for anyone whose browser is
    // older than the animation.
    expect(window.IntersectionObserver).toBeUndefined();

    renderPage();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Your journey to the perfect');
    expect(heading).toBeVisible();
    expect(heading.style.opacity).toBe('');
  });

  it('uses the reveal hook when the browser does have an observer', () => {
    const observe = vi.fn();
    const constructed = vi.fn();
    class FakeObserver {
      constructor(callback: IntersectionObserverCallback) {
        constructed(callback);
      }
      observe = observe;
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver);

    try {
      renderPage();
      // Two observers: one for the reveals, one for the counting figures.
      expect(constructed).toHaveBeenCalledTimes(2);
      expect(observe).toHaveBeenCalled();

      // And now the starting state IS applied, because something exists to
      // take it off again.
      expect(screen.getByRole('heading', { level: 1 }).style.opacity).toBe('0');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps the template figures visible without the count-up animation', () => {
    renderPage();
    // The final value is the markup, not something the animation supplies.
    expect(screen.getByText('194')).toBeVisible();
    expect(screen.getByText('227')).toBeVisible();
  });

  it('switches the product tour when a step is clicked', () => {
    renderPage();

    // The dashboard is the screen the prerender captures, so it is what a
    // visitor sees before any of this runs.
    expect(screen.getByText('Needs your attention')).toBeInTheDocument();

    const tab = screen.getByRole('button', { name: /Vendor comparison/ });
    fireEvent.click(tab);

    expect(screen.getByText(/14 of the 227 questions/)).toBeInTheDocument();
    expect(screen.queryByText('Needs your attention')).not.toBeInTheDocument();
    expect(tab).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens an FAQ answer with no JavaScript of ours involved', () => {
    renderPage();

    // <details> rather than React state, so the answers work on the
    // prerendered page too. See landing/FaqSection.tsx.
    const question = screen.getByText('Can our coordinator really not see the money?');
    const details = question.closest('details');
    expect(details).not.toBeNull();
    expect(details!.open).toBe(false);

    // What a real click does to a <details>, without our code in the path.
    details!.open = true;
    expect(details!.open).toBe(true);
  });

  it('hands the email to sign-up in router state, never in the URL', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Your email address'), {
      target: { value: 'nethmi@example.com' },
    });
    fireEvent.submit(screen.getByLabelText('Your email address').closest('form')!);

    // Router state, not a query string: a URL ends up in history, in server
    // logs and in whatever referrer the next request sends.
    expect(navigate).toHaveBeenCalledWith('/signin', {
      state: { email: 'nethmi@example.com' },
    });
    expect(window.location.search).not.toContain('nethmi');
  });

  it('points every call to action at the real sign-in route', () => {
    renderPage();
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/signin',
    );
    expect(within(header).getByRole('link', { name: /Start free/ })).toHaveAttribute(
      'href',
      '/signin',
    );
  });
});
