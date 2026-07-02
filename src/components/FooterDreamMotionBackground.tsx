import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

function CameraIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M22 42h22l8-11h20l8 11h18c8 0 14 6 14 14v34c0 8-6 14-14 14H22c-8 0-14-6-14-14V56c0-8 6-14 14-14Z" />
      <path d="M60 52a20 20 0 1 0 0 40 20 20 0 0 0 0-40Z" />
      <path d="M88 55h8" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M60 13l12 31 33 4-25 22 7 33-27-17-28 17 8-33-25-22 33-4 12-31Z" />
      <path d="M21 24l7 7M96 86l8 8M94 21l-5 12" />
    </svg>
  );
}

function CatIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M28 48l-5-24 22 13a50 50 0 0 1 30 0l22-13-5 24c9 9 14 20 14 32 0 24-21 35-46 35S14 104 14 80c0-12 5-23 14-32Z" />
      <path d="M43 73h.4M77 73h.4M52 88c5 4 11 4 16 0M60 80l-5 5h10l-5-5Z" />
      <path d="M31 82H8M35 91H13M89 82h23M85 91h22" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M76 19c-24 0-42 18-42 42 0 16 9 30 23 37" />
      <path d="M76 19c17 8 27 24 27 43 0 27-20 45-49 45" />
      <path d="M43 58c12 1 20-5 24-17M72 64h14M69 79c8 5 16 4 23-2" />
      <path d="M50 108c-7-12-5-23 5-32" />
    </svg>
  );
}

function FruitIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M61 36c9-18 24-22 38-18-2 16-12 27-31 28" />
      <path d="M61 36c-8-16-21-20-39-14 3 17 14 27 34 25" />
      <path d="M60 40c22 0 40 15 40 36s-15 36-40 36-40-15-40-36 18-36 40-36Z" />
      <path d="M60 40c3-10 2-19-3-28" />
    </svg>
  );
}

function SuitcaseIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M36 34v-8c0-8 6-14 14-14h20c8 0 14 6 14 14v8" />
      <path d="M23 34h74c8 0 14 6 14 14v46c0 8-6 14-14 14H23c-8 0-14-6-14-14V48c0-8 6-14 14-14Z" />
      <path d="M34 34v74M86 34v74M42 54h36M42 76h36" />
    </svg>
  );
}

function TrainIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M23 18h74c8 0 14 6 14 14v46c0 8-6 14-14 14H23c-8 0-14-6-14-14V32c0-8 6-14 14-14Z" />
      <path d="M22 42h76M29 30h18M60 30h18M31 58h14M55 58h14M79 58h14" />
      <path d="M34 94l-13 16M86 94l13 16M40 106h40" />
    </svg>
  );
}

function MountainIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M8 98l31-54 19 32 14-24 40 46H8Z" />
      <path d="M39 44l8 14 9-11M72 52l9 14 9-10" />
      <path d="M20 98h82" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M12 65l96-43-30 82-21-33-32 22 14-33-27 5Z" />
      <path d="M57 71l51-49" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M38 8h44c8 0 14 6 14 14v76c0 8-6 14-14 14H38c-8 0-14-6-14-14V22c0-8 6-14 14-14Z" />
      <path d="M48 22h24M54 96h12M35 34h50" />
      <path d="M44 50h32M44 64h22" />
    </svg>
  );
}

function PassportIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M29 12h50c8 0 14 6 14 14v78H35c-8 0-14-6-14-14V20c0-4 4-8 8-8Z" />
      <path d="M42 38h30M42 84h34M57 50a15 15 0 1 0 0 30 15 15 0 0 0 0-30Z" />
      <path d="M42 65h30M57 50c5 7 5 23 0 30M57 50c-5 7-5 23 0 30" />
    </svg>
  );
}

function ShipIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M24 58h72l-9 31c-3 10-12 17-23 17H45c-11 0-20-7-23-17l-9-31Z" /><path d="M38 58V28h37l16 30M45 38h10M64 38h10M18 98c9-6 18-6 27 0s18 6 27 0 18-6 27 0" /></svg>;
}

function BicycleIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M31 84a19 19 0 1 0 0 .1M89 84a19 19 0 1 0 0 .1M31 84l25-34h18l15 34M56 50l14 34H31M62 34h18M51 34h11" /></svg>;
}

function BusIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M22 18h76c7 0 12 5 12 12v54c0 7-5 12-12 12H22c-7 0-12-5-12-12V30c0-7 5-12 12-12Z" /><path d="M21 34h78M26 52h18M52 52h18M78 52h18M29 96v10M91 96v10M30 76h12M78 76h12" /></svg>;
}

function LaptopIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M28 24h64c6 0 10 4 10 10v43H18V34c0-6 4-10 10-10Z" /><path d="M10 77h100l-10 19H20L10 77ZM48 88h24" /></svg>;
}

function HeadphonesIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M20 69a40 40 0 0 1 80 0" /><path d="M20 69v21c0 8 6 14 14 14h8V66h-8c-8 0-14 6-14 14M100 69v21c0 8-6 14-14 14h-8V66h8c8 0 14 6 14 14" /></svg>;
}

function BookIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M18 22h34c10 0 18 8 18 18v62c0-10-8-18-18-18H18V22ZM70 40c0-10 8-18 18-18h14v62H88c-10 0-18 8-18 18V40Z" /><path d="M30 40h22M30 56h22M86 40h8M86 56h8" /></svg>;
}

function PenIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M85 12l23 23-62 62-30 9 9-30 60-64Z" /><path d="M74 24l22 22M25 76l19 19" /></svg>;
}

function CoffeeIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M24 44h62v26c0 17-14 31-31 31S24 87 24 70V44Z" /><path d="M86 52h10c9 0 16 7 16 16s-7 16-16 16H86M33 22c-4 7-4 12 0 17M55 18c-4 7-4 12 0 17M76 22c-4 7-4 12 0 17" /></svg>;
}

function OnigiriIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 14c14 0 45 59 45 77 0 12-8 18-45 18S15 103 15 91c0-18 31-77 45-77Z" /><path d="M49 75h22v29H49z" /><path d="M38 63c9 6 35 6 44 0" /></svg>;
}

function UmbrellaIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M14 62a46 46 0 0 1 92 0c-10-7-20-7-30 0-10-7-20-7-30 0-10-7-21-7-32 0Z" /><path d="M60 16v78c0 10 12 12 16 4" /></svg>;
}

function CompassIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 12a48 48 0 1 0 0 96 48 48 0 0 0 0-96Z" /><path d="M78 35L66 67 34 80l13-32 31-13Z" /><path d="M60 58h.4" /></svg>;
}

function MapIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M12 28l30-12 36 12 30-12v76l-30 12-36-12-30 12V28Z" /><path d="M42 16v76M78 28v76M25 46l10-4M52 45l14 5M88 50l10-4" /></svg>;
}

function TicketIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M18 40l64-24 20 52c-8 3-11 11-8 19l-64 24c-3-8-11-11-19-8L-9 51c8-3 11-11 8-19l19 8Z" transform="translate(12 0)" /><path d="M45 42l18 47M66 34l18 47" /></svg>;
}

function LeafIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M102 18C62 18 24 42 20 90c42 5 78-27 82-72Z" /><path d="M20 90c22-25 45-43 82-72M48 76c-1-14-7-24-20-30M68 56c12-1 22-7 30-18" /></svg>;
}

function FlowerIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 54c14-26 34-20 32-5-2 18-22 18-32 5Z" /><path d="M60 54c-14-26-34-20-32-5 2 18 22 18 32 5Z" /><path d="M60 54c-5-29 14-39 25-27 12 13-4 28-25 27Z" /><path d="M60 54c5 29-14 39-25 27-12-13 4-28 25-27Z" /><path d="M60 54v52M60 78c11-9 22-11 34-6" /></svg>;
}

function LaneIcon({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`lane-icon ${className}`}>{children}</span>;
}

type PhysicsIconKind =
  | "camera" | "star" | "cat" | "profile" | "fruit" | "suitcase" | "train" | "mountain" | "plane" | "phone" | "passport"
  | "ship" | "bicycle" | "bus" | "laptop" | "headphones" | "book" | "pen" | "coffee" | "onigiri" | "umbrella" | "compass" | "map" | "ticket" | "leaf" | "flower";

function renderPhysicsIcon(kind: PhysicsIconKind) {
  if (kind === "camera") return <CameraIcon />;
  if (kind === "star") return <StarIcon />;
  if (kind === "cat") return <CatIcon />;
  if (kind === "profile") return <ProfileIcon />;
  if (kind === "fruit") return <FruitIcon />;
  if (kind === "suitcase") return <SuitcaseIcon />;
  if (kind === "train") return <TrainIcon />;
  if (kind === "mountain") return <MountainIcon />;
  if (kind === "plane") return <PlaneIcon />;
  if (kind === "phone") return <PhoneIcon />;
  if (kind === "passport") return <PassportIcon />;
  if (kind === "ship") return <ShipIcon />;
  if (kind === "bicycle") return <BicycleIcon />;
  if (kind === "bus") return <BusIcon />;
  if (kind === "laptop") return <LaptopIcon />;
  if (kind === "headphones") return <HeadphonesIcon />;
  if (kind === "book") return <BookIcon />;
  if (kind === "pen") return <PenIcon />;
  if (kind === "coffee") return <CoffeeIcon />;
  if (kind === "onigiri") return <OnigiriIcon />;
  if (kind === "umbrella") return <UmbrellaIcon />;
  if (kind === "compass") return <CompassIcon />;
  if (kind === "map") return <MapIcon />;
  if (kind === "ticket") return <TicketIcon />;
  if (kind === "leaf") return <LeafIcon />;
  return <FlowerIcon />;
}

function PhysicsIconField() {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const iconRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const items = useMemo(
    () =>
      Array.from({ length: 25 }, (_, index) => {
        const kinds: PhysicsIconKind[] = [
          "camera", "star", "cat", "profile", "fruit", "suitcase", "train", "mountain", "plane", "phone",
          "passport", "ship", "bicycle", "bus", "laptop", "headphones", "book", "pen", "coffee", "onigiri",
          "umbrella", "compass", "map", "ticket", "leaf",
        ];
        const tones = ["tone-camera", "tone-star", "tone-cat", "tone-profile", "tone-fruit", "tone-suitcase", "tone-train", "tone-mountain"];
        return {
          id: `physics-icon-${index}`,
          kind: kinds[index],
          tone: tones[index % tones.length],
          size: 76 + ((index * 17) % 58),
          delay: 180 + index * 38,
        };
      }),
    [],
  );

  useEffect(() => {
    const field = fieldRef.current;
    if (!field || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let live = true;
    let last = performance.now();
    const start = performance.now();
    const rect = () => field.getBoundingClientRect();
    let bounds = rect();
    const isCompact = window.innerWidth <= 700;
    const fallGravity = isCompact ? 0.0045 : 0.006;
    const fallMaxSpeed = isCompact ? 0.16 : 0.22;
    const driftMaxSpeed = isCompact ? 0.028 : 0.04;
    const bodies = items.map((item, index) => ({
      x: Math.random() * (bounds.width + 320) - 160,
      y: -120 - Math.random() * bounds.height * 0.5,
      vx: (Math.random() - 0.5) * (isCompact ? 0.035 : 0.055),
      vy: 0,
      r: item.size * 0.42,
      rot: (index * 31) % 360,
      settled: false,
      delay: item.delay,
      targetY: bounds.height * (0.18 + Math.random() * 0.68),
    }));

    const tick = (now: number) => {
      if (!live) return;
      const dt = Math.min(2, (now - last) / 16.67);
      last = now;
      bounds = rect();
      const elapsed = now - start;

      for (let i = 0; i < bodies.length; i += 1) {
        const body = bodies[i];
        const el = iconRefs.current[i];
        if (!el) continue;
        if (elapsed < body.delay) {
          el.style.opacity = "0";
          continue;
        }
        el.style.opacity = "0.92";

        if (!body.settled) {
          body.vy += fallGravity * dt;
          if (body.vy > fallMaxSpeed) body.vy = fallMaxSpeed;
          body.y += body.vy * dt;
          const floor = body.targetY;
          if (body.y > floor) {
            body.y = floor;
            body.vy *= -0.12;
            body.vx *= 0.38;
            if (Math.abs(body.vy) < 0.055) {
              body.settled = true;
              body.vx = (((i * 7) % 9) - 4) * (isCompact ? 0.006 : 0.009) || 0.012;
              body.vy = (((i * 11) % 7) - 3) * (isCompact ? 0.004 : 0.006);
            }
          }
        } else {
          body.vx += Math.sin((frame + i * 20) / 220) * 0.00018;
          body.vy += Math.cos((frame + i * 17) / 240) * 0.00018;
          body.vx *= 0.996;
          body.vy *= 0.996;
          const maxSpeed = driftMaxSpeed;
          const speed = Math.hypot(body.vx, body.vy);
          if (speed > maxSpeed) {
            body.vx = (body.vx / speed) * maxSpeed;
            body.vy = (body.vy / speed) * maxSpeed;
          }
          body.x += body.vx * dt;
          body.y += body.vy * dt;
        }

        body.rot += body.vx * 0.12;
      }

      for (let i = 0; i < bodies.length; i += 1) {
        for (let j = i + 1; j < bodies.length; j += 1) {
          const a = bodies[i];
          const b = bodies[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.hypot(dx, dy) || 1;
          const min = a.r + b.r;
          if (distance < min) {
            const overlap = min - distance;
            const push = overlap * 0.0007;
            const nx = dx / distance;
            const ny = dy / distance;
            a.x -= nx * overlap * 0.08;
            a.y -= ny * overlap * 0.08;
            b.x += nx * overlap * 0.08;
            b.y += ny * overlap * 0.08;
            a.vx -= nx * push;
            a.vy -= ny * push;
            b.vx += nx * push;
            b.vy += ny * push;
            for (const body of [a, b]) {
              const maxSpeed = body.settled ? driftMaxSpeed : fallMaxSpeed;
              const speed = Math.hypot(body.vx, body.vy);
              if (speed > maxSpeed) {
                body.vx = (body.vx / speed) * maxSpeed;
                body.vy = (body.vy / speed) * maxSpeed;
              }
            }
          }
        }
      }

      for (let i = 0; i < bodies.length; i += 1) {
        const body = bodies[i];
        const el = iconRefs.current[i];
        if (!el) continue;
        if (body.x > bounds.width + 170) body.x = -170;
        if (body.x < -190) body.x = bounds.width + 150;
        if (body.y > bounds.height + 150) body.y = -130;
        if (body.y < -180 && body.settled) body.y = bounds.height + 120;
        el.style.transform = `translate3d(${body.x}px, ${body.y}px, 0) rotate(${body.rot}deg)`;
      }

      frame += 1;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => {
      live = false;
    };
  }, [items]);

  return (
    <div className="physics-icon-field" ref={fieldRef}>
      {items.map((item, index) => (
        <span
          className={`physics-icon ${item.tone}`}
          key={item.id}
          ref={(node) => {
            iconRefs.current[index] = node;
          }}
          style={{ width: item.size, height: item.size }}
        >
          {renderPhysicsIcon(item.kind)}
        </span>
      ))}
    </div>
  );
}

export function FooterDreamMotionBackground() {
  return (
    <div className="footer-dream-motion-bg" aria-hidden="true">
      <span className="dream-bg-word word-duomei">DUOMEI</span>
      <span className="dream-bg-word word-traveling">TRAVELING</span>
      <span className="dream-bg-word word-tami">TAMI</span>

      <svg className="dream-trails" viewBox="0 0 1440 820" preserveAspectRatio="none">
        <defs>
          <marker id="dream-arrow-pink" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0 0l10 5-10 5z" fill="#ff6fae" />
          </marker>
          <marker id="dream-arrow-yellow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0 0l10 5-10 5z" fill="#ffe15a" />
          </marker>
          <marker id="dream-arrow-blue" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0 0l10 5-10 5z" fill="#54d6ff" />
          </marker>
        </defs>
        <path className="trail trail-pink" markerEnd="url(#dream-arrow-pink)" d="M-80 680C180 560 260 260 620 190S1020 180 1500 40" />
        <path className="trail trail-yellow" markerEnd="url(#dream-arrow-yellow)" d="M1340-40C1220 160 1290 300 1160 470S980 650 820 900" />
        <path className="trail trail-blue" markerEnd="url(#dream-arrow-blue)" d="M1500 720C1130 800 920 710 690 760S250 860-90 700" />
      </svg>

      <PhysicsIconField />
      <div className="travel-icon-lanes">
        <div className="icon-lane lane-one">
          <div className="lane-track">
            <LaneIcon className="tone-camera"><CameraIcon /></LaneIcon>
            <LaneIcon className="tone-suitcase"><SuitcaseIcon /></LaneIcon>
            <LaneIcon className="tone-star"><StarIcon /></LaneIcon>
            <LaneIcon className="tone-train"><TrainIcon /></LaneIcon>
            <LaneIcon className="tone-camera"><CameraIcon /></LaneIcon>
          </div>
        </div>
        <div className="icon-lane lane-two">
          <div className="lane-track">
            <LaneIcon className="tone-cat"><CatIcon /></LaneIcon>
            <LaneIcon className="tone-mountain"><MountainIcon /></LaneIcon>
            <LaneIcon className="tone-profile"><ProfileIcon /></LaneIcon>
            <LaneIcon className="tone-fruit"><FruitIcon /></LaneIcon>
            <LaneIcon className="tone-cat"><CatIcon /></LaneIcon>
          </div>
        </div>
        <div className="icon-lane lane-three">
          <div className="lane-track">
            <LaneIcon className="tone-train"><TrainIcon /></LaneIcon>
            <LaneIcon className="tone-star"><StarIcon /></LaneIcon>
            <LaneIcon className="tone-camera"><CameraIcon /></LaneIcon>
            <LaneIcon className="tone-mountain"><MountainIcon /></LaneIcon>
            <LaneIcon className="tone-train"><TrainIcon /></LaneIcon>
          </div>
        </div>
      </div>
    </div>
  );
}
