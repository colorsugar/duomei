import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
  transitionKey: string;
};

export function PageTransition({ children, transitionKey }: PageTransitionProps) {
  return (
    <div className="page-transition" key={transitionKey}>
      {children}
    </div>
  );
}
