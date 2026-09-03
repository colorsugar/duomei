import { forwardRef, useCallback } from "react";
import type { MouseEvent } from "react";
import { flushSync } from "react-dom";
import { Link as RouterLink, resolvePath, useLocation, useNavigate } from "react-router-dom";
import type { LinkProps, NavigateOptions, To } from "react-router-dom";

/**
 * Every route change goes through the View Transitions API so the whole site
 * shares one "breath": the old page lifts and fades while the new one settles
 * in from a soft blur. The CSS lives in transitions.css under
 * `:root[data-view-transition]`. Browsers without the API just swap.
 */
export type PageTransitionKind = "page" | "shared";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
    skipTransition: () => void;
  };
};

export function runPageTransition(update: () => void, kind: PageTransitionKind = "page") {
  const viewTransitionDocument = document as ViewTransitionDocument;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !viewTransitionDocument.startViewTransition) {
    update();
    return;
  }

  const root = document.documentElement;
  root.dataset.viewTransition = kind;
  // flushSync commits the router update before the new snapshot is captured.
  const transition = viewTransitionDocument.startViewTransition(() => flushSync(update));
  void transition.finished.finally(() => {
    if (root.dataset.viewTransition === kind) delete root.dataset.viewTransition;
  });
}

function samePathname(to: To, currentPathname: string) {
  return resolvePath(to, currentPathname).pathname === currentPathname;
}

/** `navigate` that breathes between pages and stays instant for same-page hash jumps. */
export function useTransitionNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback((to: To, options?: NavigateOptions) => {
    if (samePathname(to, location.pathname)) {
      navigate(to, options);
      return;
    }
    runPageTransition(() => navigate(to, options));
  }, [location.pathname, navigate]);
}

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}

/** Drop-in for react-router's Link that routes through the page transition. */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function TransitionLink(
  { onClick, to, replace, state, target, reloadDocument, ...rest },
  ref,
) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented
      || reloadDocument
      || (target && target !== "_self")
      || !isPlainLeftClick(event)
      || samePathname(to, location.pathname)
    ) return;
    event.preventDefault();
    runPageTransition(() => navigate(to, { replace, state }));
  };

  return (
    <RouterLink
      ref={ref}
      to={to}
      replace={replace}
      state={state}
      target={target}
      reloadDocument={reloadDocument}
      onClick={handleClick}
      {...rest}
    />
  );
});
