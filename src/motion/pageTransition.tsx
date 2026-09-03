import { forwardRef, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { Link as RouterLink, useNavigate, type LinkProps } from "react-router-dom";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

/**
 * Route changes breathe through the View Transitions API. `data-view-transition`
 * on <html> lets transitions.css pick the page variant while the note journey
 * (card → detail) keeps its own shared-element choreography untouched.
 */
export function runPageTransition(callback: () => void) {
  const root = document.documentElement;
  const viewTransitionDocument = document as ViewTransitionDocument;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !viewTransitionDocument.startViewTransition) {
    callback();
    return;
  }

  root.dataset.viewTransition = "page";
  const transition = viewTransitionDocument.startViewTransition(() => {
    flushSync(callback);
  });
  void transition.finished.finally(() => {
    if (root.dataset.viewTransition === "page") delete root.dataset.viewTransition;
  });
}

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}

/** Drop-in for react-router's Link whose navigation runs inside a page transition. */
export const TransitionLink = forwardRef<HTMLAnchorElement, LinkProps>(function TransitionLink(
  { onClick, to, replace, state, target, ...rest },
  ref,
) {
  const navigate = useNavigate();

  return (
    <RouterLink
      {...rest}
      ref={ref}
      to={to}
      replace={replace}
      state={state}
      target={target}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !isPlainLeftClick(event) || (target && target !== "_self")) return;
        event.preventDefault();
        runPageTransition(() => navigate(to, { replace, state }));
      }}
    />
  );
});
