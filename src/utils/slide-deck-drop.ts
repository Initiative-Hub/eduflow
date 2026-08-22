/**
 * Support for "dropping" (hiding) individual slides in a generated deck.
 *
 * A dropped slide stays in the saved HTML so it can be restored later, but it is
 * never reached while presenting. The generated deck ships its own navigation
 * script that walks every `.slide`, so persistence relies on a runtime script
 * that re-implements `show`/`step` to skip dropped slides.
 *
 * Hiding relies on the deck's existing behavior rather than extra CSS: a slide
 * without the `active` class is already `opacity:0; visibility:hidden`. Because
 * presenting happens in the same document as editing (fullscreen only expands
 * the editor container), the runtime must never depend on an "is presenting"
 * flag. Editors reach dropped slides by activating them directly, which
 * bypasses navigation.
 */

export const SLIDE_DROP_ATTRIBUTE = 'data-slide-dropped';
export const SLIDE_DROP_RUNTIME_ATTRIBUTE = 'data-slide-drop-runtime';
/** Legacy marker from an earlier gated implementation; stripped on save. */
const LEGACY_EDITING_ATTRIBUTE = 'data-slide-editing';
const LEGACY_DROP_STYLE_ATTRIBUTE = 'data-slide-drop-style';

/**
 * Navigation that skips dropped slides.
 *
 * Kept as a plain string because it is serialized into the persisted deck HTML
 * and runs inside the deck document, not in the application bundle.
 *
 *
 * Valication on slide extraction
 */
const DROP_RUNTIME_SCRIPT = `
(function () {
  var DROP_ATTRIBUTE = '${SLIDE_DROP_ATTRIBUTE}';
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  if (!slides.length) return;

  var index = 0;

  function presentableSlides() {
    var visible = slides.filter(function (slide) {
      return slide.getAttribute(DROP_ATTRIBUTE) !== 'true';
    });
    return visible.length ? visible : slides;
  }

  function render(list, next) {
    index = Math.max(0, Math.min(list.length - 1, next));
    var target = list[index];
    slides.forEach(function (slide) {
      slide.classList.remove('active');
    });
    void target.offsetWidth;
    target.classList.add('active');
    updateCounter(list);
  }

  function updateCounter(list) {
    var counter = document.getElementById('counter');
    if (counter) counter.textContent = index + 1 + ' / ' + list.length;
  }

  window.show = function (next) {
    render(presentableSlides(), next);
  };
  window.step = function (delta) {
    render(presentableSlides(), index + delta);
  };

  // Lets the editor re-sync after dropping or restoring a slide without
  // forcing the active slide to change: a just-dropped slide must stay on
  // screen so the action can be undone.
  window.refreshDroppedSlides = function () {
    var list = presentableSlides();
    var active = document.querySelector('.slide.active');
    var current = list.indexOf(active);
    if (current >= 0) {
      index = current;
    }
    updateCounter(list);
  };

  // On load, never open on a dropped slide.
  var initial = presentableSlides();
  var activeOnLoad = document.querySelector('.slide.active');
  var activePosition = initial.indexOf(activeOnLoad);
  render(initial, activePosition >= 0 ? activePosition : 0);
})();
`;

export function getSlideElements(doc: Document): HTMLElement[] {
  return Array.from(doc.querySelectorAll<HTMLElement>('.slide'));
}

export function isSlideDropped(slide: Element): boolean {
  return slide.getAttribute(SLIDE_DROP_ATTRIBUTE) === 'true';
}

export function countDroppedSlides(doc: Document): number {
  return getSlideElements(doc).filter(isSlideDropped).length;
}

/**
 * Clears artifacts of the earlier gated implementation from a live editor
 * document so previously saved decks stop hiding dropped slides outright and
 * remain restorable.
 */
export function removeLegacySlideDropStyles(doc: Document): void {
  doc.body?.removeAttribute(LEGACY_EDITING_ATTRIBUTE);
  doc
    .querySelectorAll(`style[${LEGACY_DROP_STYLE_ATTRIBUTE}]`)
    .forEach((element) => {
      element.remove();
    });
}

/**
 * Activates a slide directly, bypassing deck navigation so a dropped slide can
 * be brought back on screen to restore it.
 *
 * Deliberately does not call into the deck runtime: decks saved by the earlier
 * implementation would immediately navigate away from a dropped slide.
 */
export function activateSlide(doc: Document, slide: HTMLElement): void {
  for (const element of getSlideElements(doc)) {
    element.classList.remove('active');
  }
  slide.classList.add('active');
}

/** Re-syncs deck navigation state after a drop or restore. */
export function refreshDroppedSlides(doc: Document): void {
  (
    doc.defaultView as (Window & { refreshDroppedSlides?: () => void }) | null
  )?.refreshDroppedSlides?.();
}

/**
 * Injects the navigation runtime into a deck document that is about to be
 * persisted, replacing any previously injected copy.
 */
export function applySlideDropRuntime(root: HTMLElement, doc: Document): void {
  root
    .querySelectorAll(
      `script[${SLIDE_DROP_RUNTIME_ATTRIBUTE}], style[${LEGACY_DROP_STYLE_ATTRIBUTE}]`
    )
    .forEach((element) => {
      element.remove();
    });
  root.querySelectorAll(`[${LEGACY_EDITING_ATTRIBUTE}]`).forEach((element) => {
    element.removeAttribute(LEGACY_EDITING_ATTRIBUTE);
  });
  root.removeAttribute(LEGACY_EDITING_ATTRIBUTE);

  const body = root.querySelector('body') ?? root;
  const script = doc.createElement('script');
  script.setAttribute(SLIDE_DROP_RUNTIME_ATTRIBUTE, 'true');
  script.textContent = DROP_RUNTIME_SCRIPT;
  body.appendChild(script);
}
