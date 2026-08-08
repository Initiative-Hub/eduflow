// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  activateSlide,
  applySlideDropRuntime,
  countDroppedSlides,
  getSlideElements,
  isSlideDropped,
  removeLegacySlideDropStyles,
  SLIDE_DROP_ATTRIBUTE,
} from '@/utils/slide-deck-drop';

/**
 * Mirrors the generated deck: slides are only visible via the `active` class,
 * and navigation is provided by the vendored slide_skills script.
 */
const DECK_MARKUP = `<head><title>deck</title>
<style>
  .slide { opacity: 0; visibility: hidden; }
  .slide.active { opacity: 1; visibility: visible; }
</style>
</head>
<body>
<div class="stage">
  <div class="slide active"><svg></svg></div>
  <div class="slide"><svg></svg></div>
  <div class="slide"><svg></svg></div>
</div>
<div class="hud"><span id="counter">1 / 3</span></div>
</body>`;

type DeckWindow = typeof window & {
  step: (delta: number) => void;
  show: (index: number) => void;
  refreshDroppedSlides: () => void;
};

const deckWindow = () => window as DeckWindow;

function saveDeck(droppedIndexes: number[]) {
  document.documentElement.innerHTML = DECK_MARKUP;
  const slides = getSlideElements(document);
  for (const index of droppedIndexes) {
    slides[index].setAttribute(SLIDE_DROP_ATTRIBUTE, 'true');
  }

  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  applySlideDropRuntime(clone, document);
  return clone.innerHTML;
}

/** Loads saved deck HTML and runs the persisted runtime as a browser would. */
function loadDeck(savedHtml: string) {
  document.documentElement.innerHTML = savedHtml;
  const runtime = document.querySelector(
    'script[data-slide-drop-runtime]'
  )?.textContent;
  new Function(runtime ?? '')();
}

function activeIndex() {
  return getSlideElements(document).findIndex((slide) =>
    slide.classList.contains('active')
  );
}

const counterText = () => document.getElementById('counter')?.textContent;

describe('slide drop', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '';
  });

  it('persists the dropped marker through a save', () => {
    loadDeck(saveDeck([7 % 3]));
    expect(countDroppedSlides(document)).toBe(1);
  });

  it('skips dropped slides when navigating forward and back', () => {
    loadDeck(saveDeck([1]));

    expect(activeIndex()).toBe(0);
    deckWindow().step(1);
    expect(activeIndex()).toBe(2);
    deckWindow().step(-1);
    expect(activeIndex()).toBe(0);
  });

  it('never leaves a dropped slide visible during navigation', () => {
    loadDeck(saveDeck([1]));

    const dropped = getSlideElements(document)[1];
    for (const delta of [1, 1, -1, -1, 1]) {
      deckWindow().step(delta);
      expect(dropped.classList.contains('active')).toBe(false);
    }
  });

  it('counts only presentable slides', () => {
    loadDeck(saveDeck([1]));
    expect(counterText()).toBe('1 / 2');
  });

  it('never opens on a dropped slide', () => {
    loadDeck(saveDeck([0]));
    expect(activeIndex()).toBe(1);
  });

  it('does not depend on an editing flag, since presenting reuses the editor document', () => {
    const savedHtml = saveDeck([1]);
    expect(savedHtml).not.toContain('data-slide-editing');
    expect(savedHtml).not.toContain('display: none');

    loadDeck(savedHtml);
    document.body.setAttribute('data-slide-editing', 'true');
    deckWindow().step(1);
    expect(activeIndex()).toBe(2);
  });

  it('keeps a dropped slide on screen when it is activated directly for restoring', () => {
    loadDeck(saveDeck([1]));

    const dropped = getSlideElements(document)[1];
    activateSlide(document, dropped);
    expect(dropped.classList.contains('active')).toBe(true);

    // Restoring keeps it active and returns it to the presentable count.
    dropped.removeAttribute(SLIDE_DROP_ATTRIBUTE);
    deckWindow().refreshDroppedSlides();
    expect(isSlideDropped(dropped)).toBe(false);
    expect(counterText()).toBe('2 / 3');
  });

  it('falls back to all slides if every slide was dropped', () => {
    loadDeck(saveDeck([0, 1, 2]));

    expect(activeIndex()).toBe(0);
    expect(counterText()).toBe('1 / 3');
  });

  it('strips legacy hiding styles so old decks stay restorable', () => {
    document.documentElement.innerHTML = `<head><style data-slide-drop-style>
      body:not([data-slide-editing="true"]) .slide[data-slide-dropped="true"] { display: none !important; }
    </style></head><body data-slide-editing="true"><div class="slide active"></div></body>`;

    removeLegacySlideDropStyles(document);

    expect(document.querySelector('style[data-slide-drop-style]')).toBeNull();
    expect(document.body.hasAttribute('data-slide-editing')).toBe(false);
  });
});
