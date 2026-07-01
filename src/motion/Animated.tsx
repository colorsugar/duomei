import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type ElementType,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type SyntheticEvent,
  type Ref,
  type ReactElement,
  type ReactNode,
} from "react";
import { useMotion } from "./MotionProvider";

type MotionKind = "title" | "paragraph" | "button" | "image" | "tag" | "footer";

type PolymorphicProps<T extends ElementType> = HTMLAttributes<HTMLElement> & {
  as?: T;
  children?: ReactNode;
  motionRef?: Ref<HTMLElement>;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className" | "style">;

function joinClass(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function sequenceIndex(kind: MotionKind) {
  const order: MotionKind[] = ["title", "paragraph", "button", "image", "tag", "footer"];
  return order.indexOf(kind);
}

export function RevealSection<T extends ElementType = "section">({
  as,
  children,
  className,
  motionRef,
  ...props
}: PolymorphicProps<T>) {
  const Component = (as ?? "section") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const { tokens, prefersReducedMotion } = useMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || revealed || prefersReducedMotion) {
      if (prefersReducedMotion) setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: tokens.reveal.viewportAmount },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [prefersReducedMotion, revealed, tokens.reveal.viewportAmount]);

  return (
    <Component
      {...props}
      ref={(node: HTMLElement | null) => {
        ref.current = node;
        if (typeof motionRef === "function") motionRef(node);
        else if (motionRef && "current" in motionRef) {
          (motionRef as { current: HTMLElement | null }).current = node;
        }
      }}
      className={joinClass("duomei-motion-reveal-section", revealed && "is-revealed", className)}
    >
      {children}
    </Component>
  );
}

function RevealItem<T extends ElementType>({
  as,
  kind,
  className,
  style,
  children,
  ...props
}: PolymorphicProps<T> & { kind: MotionKind }) {
  const Component = (as ?? "div") as ElementType;
  const revealStyle = {
    "--motion-stagger-index": sequenceIndex(kind),
    ...style,
  } as CSSProperties;

  return (
    <Component
      {...props}
      style={revealStyle}
      className={joinClass("duomei-motion-reveal-item", `duomei-motion-${kind}`, className)}
    >
      {children}
    </Component>
  );
}

export function AnimatedTitle<T extends ElementType = "h2">(props: PolymorphicProps<T>) {
  return <RevealItem {...props} as={props.as ?? "h2"} kind="title" />;
}

export function AnimatedParagraph<T extends ElementType = "p">(props: PolymorphicProps<T>) {
  return <RevealItem {...props} as={props.as ?? "p"} kind="paragraph" />;
}

export function AnimatedButton<T extends ElementType = "button">(props: PolymorphicProps<T>) {
  return <RevealItem {...props} as={props.as ?? "button"} kind="button" className={joinClass("duomei-motion-button", props.className)} />;
}

export function AnimatedTag<T extends ElementType = "span">(props: PolymorphicProps<T>) {
  return <RevealItem {...props} as={props.as ?? "span"} kind="tag" className={joinClass("duomei-motion-tag", props.className)} />;
}

export function AnimatedCard<T extends ElementType = "article">({
  as,
  className,
  children,
  ...props
}: PolymorphicProps<T>) {
  const Component = (as ?? "article") as ElementType;
  return (
    <Component
      {...props}
      className={joinClass("duomei-motion-card", className)}
    >
      {children}
    </Component>
  );
}

export function AnimatedImage({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { tokens, prefersReducedMotion } = useMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || revealed || prefersReducedMotion) {
      if (prefersReducedMotion) setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: tokens.reveal.viewportAmount },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [prefersReducedMotion, revealed, tokens.reveal.viewportAmount]);

  useEffect(() => {
    const image = ref.current?.querySelector("img");
    if (image?.complete && image.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [children]);

  return (
    <div {...props} ref={ref} className={joinClass("duomei-motion-image", revealed && "is-image-revealed", className)}>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const element = child as ReactElement<ImgHTMLAttributes<HTMLImageElement> & { className?: string }>;
        const originalOnLoad = element.props.onLoad;
        return cloneElement(element, {
          className: joinClass("duomei-motion-image-media", "duomei-photography-media", loaded && "is-loaded", element.props.className),
          onLoad: (event: SyntheticEvent<HTMLImageElement>) => {
            setLoaded(true);
            originalOnLoad?.(event);
          },
        });
      })}
    </div>
  );
}

export function SharedMotionElement({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={joinClass("duomei-motion-shared", className)}>
      {children}
    </div>
  );
}
