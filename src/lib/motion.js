import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Scroll reveals for anything marked data-fade or data-split inside `ref`.
export function useReveal(ref, deps = []) {
  useLayoutEffect(() => {
    if (!ref.current || reduceMotion()) return undefined;
    const ctx = gsap.context(() => {
      ref.current.querySelectorAll('[data-split]').forEach((el) => {
        SplitText.create(el, {
          type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
          onSplit: (self) => gsap.from(self.lines, {
            yPercent: 135, duration: 1.2, stagger: 0.09, ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          }),
        });
      });
      ref.current.querySelectorAll('[data-fade]').forEach((el) => {
        gsap.from(el, { y: 36, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
      });
    }, ref);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export { gsap, ScrollTrigger, SplitText };
