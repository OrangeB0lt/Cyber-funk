// @vitest-environment jsdom
/** The Sprite component: crisp, decorative SVG at whole-number scales; hits replay the flash. */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Sprite } from './Sprite';

// Vitest runs without globals, so Testing Library can't register its own cleanup.
afterEach(cleanup);

const svgOf = (el: HTMLElement) => el.querySelector('svg')!;

describe('Sprite', () => {
  it('draws a decorative, crisp SVG sized to the grid times the scale', () => {
    const { getByTestId } = render(<Sprite id="hush_patrol" scale={3} />);
    const svg = svgOf(getByTestId('sprite:hush_patrol'));
    expect(svg.getAttribute('width')).toBe('72');
    expect(svg.getAttribute('height')).toBe('72');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('shape-rendering')).toBe('crispEdges');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('draws bosses from a 32-pixel grid', () => {
    const { getByTestId } = render(<Sprite id="captain_hush" scale={3} />);
    expect(svgOf(getByTestId('sprite:captain_hush')).getAttribute('width')).toBe('96');
  });

  it('remounts the art for each new hit, so the flash replays', () => {
    const { getByTestId, rerender } = render(<Sprite id="nutria" scale={2} hit={5} />);
    const first = svgOf(getByTestId('sprite:nutria'));
    expect(first.getAttribute('class')).toMatch(/hit/);
    rerender(<Sprite id="nutria" scale={2} hit={9} />);
    expect(svgOf(getByTestId('sprite:nutria'))).not.toBe(first);
    rerender(<Sprite id="nutria" scale={2} hit={9} />);
    expect(svgOf(getByTestId('sprite:nutria'))).toBe(svgOf(getByTestId('sprite:nutria')));
  });

  it('mirrors when flipped', () => {
    const { getByTestId } = render(<Sprite id="hero_trumpet" scale={2} flip />);
    expect(svgOf(getByTestId('sprite:hero_trumpet')).getAttribute('class')).toMatch(/flip/);
  });
});
