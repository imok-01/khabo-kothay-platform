import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/**
 * SpotlightDeck — a group of cards that light under the cursor.
 *
 * This is React Bits' MagicBento, kept as an effect and rebuilt as a
 * primitive. The five things it does are theirs: a beam that follows the
 * pointer, a hairline border-glow on each card that tracks proximity,
 * motes that drift while a card is hovered, a slight 3D tilt, and a
 * ripple from the point of a click. What changed is everything about how
 * they are wired, because the original is written for a hero bento on a
 * near-black landing page and this has to live inside one section of a
 * cream editorial page.
 *
 * **The beam is a child of the deck, not of `document.body`.** It carries
 * `mix-blend-mode: screen`, which lifts whatever is behind it — and behind
 * this page is paper. A body-level fixed beam washed the whole page pale
 * and outlived the section that owned it. Parented to the deck, it only
 * ever lifts the ink ground it was drawn for, the deck's `overflow: hidden`
 * clips it, and `isolation: isolate` stops the blend leaking past the deck.
 * It also means no document-level listener on a page that has none.
 *
 * **One pointer listener, not four per card plus one on the document.**
 * The deck derives which card is under the cursor from its own
 * `pointermove` and runs enter/leave itself, so the listener count is 3
 * for any number of cards. The original attaches `mouseenter`,
 * `mouseleave`, `mousemove` and `click` to every card.
 *
 * **Distance is measured to the card's edge, not to its centre minus half
 * its longest side.** The original's approximation is wrong for any card
 * that is not square — on a wide fact card it lit the glow while the
 * cursor was still a long way off the short edge. `max(left - x, 0,
 * x - right)` is the true distance to the rectangle, and the glow tracks
 * the way a light would.
 *
 * **Tweens overwrite.** The original starts a fresh tween on every
 * `mousemove` with no `overwrite`, so a second of hovering leaves ~60
 * live tweens on one element fighting over `transform`.
 *
 * Tilt and magnetism are turned down hard by default — 3.5° and 2%,
 * against 10° and 5%. These cards hold serif prose that has to stay
 * readable, and KK's direction is explicit that premium is calm.
 *
 * `textAutoHide` is not ported. It line-clamps the card's body, and the
 * one surface using this holds sentences that were approved individually
 * against a named source; truncating them is the one thing that may not
 * happen.
 *
 * Appearance is *not* here. The deck's ground, the card's fill and every
 * type decision belong to the calling section — this owns the beam, the
 * glow variables, the motes, the ripple and the transforms. See
 * `primitives.css` §Spotlight deck for the mechanics, and editorial.css
 * §14d for the one surface currently built on it.
 *
 * Nothing runs under `prefers-reduced-motion`, and nothing runs without a
 * fine pointer that can hover — every effect here is a cursor effect, so
 * on a phone there is no cursor to answer. The surface has to be finished
 * without any of it; the animation is the reward for having a mouse.
 */

/** The class the deck looks for. A card without it is invisible to the beam. */
export const SPOTLIGHT_CARD_CLASS = 'kk-spot';

/** `--saffron-400`. Gold is KK's emphasis colour, and light is emphasis. */
const DEFAULT_GLOW = '240, 168, 51';
const DEFAULT_RADIUS = 320;
const DEFAULT_MOTES = 6;

/** Degrees at the corner. The original's 10 blurs 17px serif text. */
const TILT_DEG = 3.5;
/** Fraction of the cursor's offset from centre. The original's is 0.05. */
const MAGNET = 0.02;

export interface SpotlightDeckProps {
  children: ReactNode;
  /** `ol` when the cards are a numbered set — the deck is then the list. */
  as?: 'div' | 'ol' | 'ul';
  className?: string;
  /** `R, G, B` with no wrapper, so CSS can build any alpha from it. */
  glowColor?: string;
  /** Full-glow inside half of this; faded out by three quarters of it. */
  spotlightRadius?: number;
  moteCount?: number;
  enableMotes?: boolean;
  enableBeam?: boolean;
  enableBorderGlow?: boolean;
  enableTilt?: boolean;
  enableMagnetism?: boolean;
  clickEffect?: boolean;
  /** Force everything off regardless of what the media queries say. */
  disableAnimations?: boolean;
}

type Swarm = { motes: HTMLElement[]; timers: number[] };

export default function SpotlightDeck({
  children,
  as: Tag = 'div',
  className,
  glowColor = DEFAULT_GLOW,
  spotlightRadius = DEFAULT_RADIUS,
  moteCount = DEFAULT_MOTES,
  enableMotes = true,
  enableBeam = true,
  enableBorderGlow = true,
  enableTilt = true,
  enableMagnetism = true,
  clickEffect = true,
  disableAnimations = false,
}: SpotlightDeckProps) {
  const deckRef = useRef<HTMLDivElement>(null);

  // Both start `false` during prerender and correct on mount, so the 219
  // prerendered routes ship the static surface and pick the motion up in the
  // browser — which is the right way round for a decoration.
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const off = disableAnimations || reduce || !canHover;

  useEffect(() => {
    const deck = deckRef.current;
    if (off || !deck) return;

    const cards = () => Array.from(deck.querySelectorAll<HTMLElement>(`.${SPOTLIGHT_CARD_CLASS}`));

    let beam: HTMLDivElement | null = null;
    if (enableBeam) {
      beam = document.createElement('div');
      beam.className = 'kk-spot-beam';
      beam.setAttribute('aria-hidden', 'true');
      const size = Math.round(spotlightRadius * 2.2);
      beam.style.width = `${size}px`;
      beam.style.height = `${size}px`;
      // Centred on its own origin so only `x`/`y` have to move — the
      // original animates `left`/`top`, which is a layout write per frame.
      gsap.set(beam, { xPercent: -50, yPercent: -50, opacity: 0 });
      deck.appendChild(beam);
    }

    const proximity = spotlightRadius * 0.5;
    const fade = spotlightRadius * 0.75;
    const swarms = new Map<HTMLElement, Swarm>();
    let hovered: HTMLElement | null = null;

    const light = (card: HTMLElement) => {
      if (!enableMotes || swarms.has(card)) return;
      const { width, height } = card.getBoundingClientRect();
      const swarm: Swarm = { motes: [], timers: [] };
      swarms.set(card, swarm);

      for (let i = 0; i < moteCount; i += 1) {
        // Staggered rather than all at once: six motes appearing together
        // is a flash, six arriving over half a second is an ember catching.
        const timer = window.setTimeout(() => {
          // The swarm is looked up again rather than closed over, so a
          // leave-then-re-enter inside the stagger window cannot append
          // motes to a swarm nobody is holding any more.
          if (hovered !== card || swarms.get(card) !== swarm) return;
          const mote = document.createElement('span');
          mote.className = 'kk-spot-mote';
          mote.style.left = `${Math.random() * width}px`;
          mote.style.top = `${Math.random() * height}px`;
          card.appendChild(mote);
          swarm.motes.push(mote);

          gsap.fromTo(
            mote,
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 0.85, duration: 0.5, ease: 'back.out(1.6)' },
          );
          // `sine.inOut` and 4–7s, against the original's linear 2–4s with a
          // full 360° spin. A mote that drifts reads as dust in a light beam;
          // one that races reads as a loading spinner.
          gsap.to(mote, {
            x: (Math.random() - 0.5) * 54,
            y: (Math.random() - 0.5) * 54,
            duration: 4 + Math.random() * 3,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });
          gsap.to(mote, {
            opacity: 0.22,
            duration: 2.4,
            delay: 0.5,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });
        }, i * 140);
        swarm.timers.push(timer);
      }
    };

    const douse = (card: HTMLElement) => {
      const swarm = swarms.get(card);
      if (!swarm) return;
      swarms.delete(card);
      swarm.timers.forEach(clearTimeout);
      for (const mote of swarm.motes) {
        gsap.killTweensOf(mote);
        gsap.to(mote, {
          scale: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => mote.remove(),
        });
      }
    };

    const rest = (card: HTMLElement) => {
      douse(card);
      if (!enableTilt && !enableMagnetism) return;
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        x: 0,
        y: 0,
        duration: 0.55,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    };

    /**
     * One pass per frame, and every measurement taken before any style is
     * written.
     *
     * Both halves of that matter. A pointer reports faster than the screen
     * refreshes — a 125 Hz mouse dispatches roughly two `pointermove`s per
     * frame, a smooth-scrolling trackpad more — and the deck only ever paints
     * once per frame, so the earlier passes were computing a glow position
     * nobody would ever see. And the pass itself interleaved reads with
     * writes: it wrote three custom properties on card 1, then called
     * `getBoundingClientRect()` on card 2, which is a forced style recalc and
     * layout on a dirtied document, once per card per event.
     *
     * Coalescing to `requestAnimationFrame` and hoisting the rect reads above
     * the writes gives the same numbers — each card's glow depends only on its
     * own rect and the pointer — from one layout instead of N.
     */
    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    const pass = () => {
      frame = 0;
      const point = pending;
      pending = null;
      if (!point) return;
      const { x: clientX, y: clientY } = point;

      // Read pass: rects only, no writes, so the layout stays clean.
      const deckBox = beam ? deck.getBoundingClientRect() : null;
      const measured = cards().map((card) => {
        const box = card.getBoundingClientRect();
        // True distance to the rectangle: zero anywhere inside it, and the
        // perpendicular gap to whichever edge or corner is closest outside.
        const gapX = Math.max(box.left - clientX, 0, clientX - box.right);
        const gapY = Math.max(box.top - clientY, 0, clientY - box.bottom);
        return { card, box, gap: Math.hypot(gapX, gapY) };
      });

      let under: HTMLElement | null = null;
      let underBox: DOMRect | null = null;
      let nearest = Infinity;
      for (const m of measured) {
        if (m.gap === 0) {
          under = m.card;
          underBox = m.box;
        }
        if (m.gap < nearest) nearest = m.gap;
      }

      // Write pass.
      if (enableBorderGlow) {
        for (const { card, box, gap } of measured) {
          let intensity = 0;
          if (gap <= proximity) intensity = 1;
          else if (gap <= fade) intensity = (fade - gap) / (fade - proximity);
          card.style.setProperty('--kk-glow-x', `${((clientX - box.left) / box.width) * 100}%`);
          card.style.setProperty('--kk-glow-y', `${((clientY - box.top) / box.height) * 100}%`);
          card.style.setProperty('--kk-glow-i', intensity.toFixed(3));
        }
      }

      if (under !== hovered) {
        if (hovered) rest(hovered);
        if (under) light(under);
        hovered = under;
      }

      if (under && underBox && (enableTilt || enableMagnetism)) {
        const halfW = underBox.width / 2;
        const halfH = underBox.height / 2;
        const offX = clientX - underBox.left - halfW;
        const offY = clientY - underBox.top - halfH;
        gsap.to(under, {
          rotateX: enableTilt ? (offY / halfH) * -TILT_DEG : 0,
          rotateY: enableTilt ? (offX / halfW) * TILT_DEG : 0,
          x: enableMagnetism ? offX * MAGNET : 0,
          y: enableMagnetism ? offY * MAGNET : 0,
          duration: 0.5,
          ease: 'power3.out',
          transformPerspective: 900,
          overwrite: 'auto',
        });
      }

      if (beam && deckBox) {
        gsap.to(beam, {
          x: clientX - deckBox.left,
          y: clientY - deckBox.top,
          duration: 0.42,
          ease: 'power3.out',
          overwrite: 'auto',
        });
        const target =
          nearest <= proximity ? 1 : nearest <= fade ? (fade - nearest) / (fade - proximity) : 0;
        gsap.to(beam, {
          opacity: target * 0.9,
          // Arrives quicker than it leaves: §8b's settle/answer pair, in JS.
          duration: target > 0 ? 0.28 : 0.6,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    const onMove = (event: PointerEvent) => {
      pending = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(pass);
    };

    const onLeave = () => {
      // A move can be queued and the pointer gone before the frame runs. Left
      // to fire, that frame would re-light the card the pointer has just left
      // and hold the beam up, because its coordinates are still inside.
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      pending = null;
      if (hovered) {
        rest(hovered);
        hovered = null;
      }
      for (const card of cards()) card.style.setProperty('--kk-glow-i', '0');
      if (beam) {
        gsap.to(beam, { opacity: 0, duration: 0.6, ease: 'power2.out', overwrite: 'auto' });
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const card = target?.closest<HTMLElement>(`.${SPOTLIGHT_CARD_CLASS}`);
      if (!card) return;
      const box = card.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      // Reach the furthest corner, so the ripple always crosses the whole card.
      const reach = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - box.width, y),
        Math.hypot(x, y - box.height),
        Math.hypot(x - box.width, y - box.height),
      );
      const ripple = document.createElement('span');
      ripple.className = 'kk-spot-ripple';
      ripple.style.width = `${reach * 2}px`;
      ripple.style.height = `${reach * 2}px`;
      ripple.style.left = `${x - reach}px`;
      ripple.style.top = `${y - reach}px`;
      card.appendChild(ripple);
      gsap.fromTo(
        ripple,
        { scale: 0, opacity: 0.9 },
        {
          scale: 1,
          opacity: 0,
          duration: 0.9,
          ease: 'power2.out',
          onComplete: () => ripple.remove(),
        },
      );
    };

    deck.addEventListener('pointermove', onMove);
    deck.addEventListener('pointerleave', onLeave);
    if (clickEffect) deck.addEventListener('click', onClick);

    return () => {
      deck.removeEventListener('pointermove', onMove);
      deck.removeEventListener('pointerleave', onLeave);
      deck.removeEventListener('click', onClick);
      if (frame) cancelAnimationFrame(frame);
      // Torn down synchronously, not animated out: on unmount there is no
      // frame left to animate in, and a tween holding a detached node is a
      // leak rather than a fade.
      for (const swarm of swarms.values()) {
        swarm.timers.forEach(clearTimeout);
        for (const mote of swarm.motes) {
          gsap.killTweensOf(mote);
          mote.remove();
        }
      }
      swarms.clear();
      for (const card of cards()) {
        gsap.killTweensOf(card);
        gsap.set(card, { clearProps: 'transform' });
        card.style.removeProperty('--kk-glow-i');
        for (const spent of card.querySelectorAll('.kk-spot-mote, .kk-spot-ripple')) spent.remove();
      }
      if (beam) {
        gsap.killTweensOf(beam);
        beam.remove();
      }
    };
  }, [
    off,
    glowColor,
    spotlightRadius,
    moteCount,
    enableMotes,
    enableBeam,
    enableBorderGlow,
    enableTilt,
    enableMagnetism,
    clickEffect,
  ]);

  return (
    <Tag
      ref={deckRef as React.Ref<never>}
      className={['kk-spotdeck', enableBorderGlow && 'kk-spotdeck--glow', className]
        .filter(Boolean)
        .join(' ')}
      style={
        {
          '--kk-glow-rgb': glowColor,
          '--kk-glow-r': `${spotlightRadius}px`,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}

export interface SpotlightCardProps {
  children: ReactNode;
  /** `li` when the deck is a list. */
  as?: 'div' | 'li' | 'article';
  className?: string;
}

/**
 * A card the deck can find. Thin on purpose: it exists so the class the
 * deck queries for is written once, and so a call site cannot silently
 * opt a card out of the effect by renaming its own modifier.
 */
export function SpotlightCard({ children, as: Tag = 'div', className }: SpotlightCardProps) {
  return (
    <Tag className={[SPOTLIGHT_CARD_CLASS, className].filter(Boolean).join(' ')}>{children}</Tag>
  );
}
