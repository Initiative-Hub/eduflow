export type SlideCanvasImageElement = SVGImageElement | HTMLImageElement;

interface SlideCanvasAiControlsOptions {
  document: Document;
  textActionLabel: string;
  imageActionLabel: string;
  onTextAction: (element: SVGTextContentElement) => void;
  onImageAction: (element: SlideCanvasImageElement) => void;
  onActiveSlideChange: () => void;
}

export interface SlideCanvasAiControls {
  hide: () => void;
  cleanup: () => void;
}

type HoverTarget =
  | { kind: 'text'; element: SVGTextContentElement }
  | { kind: 'image'; element: SlideCanvasImageElement };

const CONTROL_ATTRIBUTE = 'data-slide-ai-action';
const CONTROL_STYLE_ATTRIBUTE = 'data-slide-ai-controls';
const HIDE_DELAY_MS = 120;

function resolveHoverTarget(
  document: Document,
  eventTarget: EventTarget | null
): HoverTarget | null {
  const eventElement = eventTarget as Element | null;
  if (typeof eventElement?.closest !== 'function') return null;

  const element = eventElement.closest<SVGElement | HTMLImageElement>(
    'text, tspan, image, img'
  );
  const activeSlide = document.querySelector<HTMLElement>('.slide.active');
  if (
    !element ||
    !activeSlide?.contains(element) ||
    element.closest('defs, clipPath, mask, pattern, symbol')
  ) {
    return null;
  }

  const tagName = element.tagName.toLowerCase();
  if (tagName === 'img' || tagName === 'image') {
    return {
      kind: 'image',
      element: element as SlideCanvasImageElement,
    };
  }

  const textElement = element as SVGTextContentElement;
  const hasChildTextRuns = Boolean(textElement.querySelector('tspan'));
  if (!textElement.textContent?.trim() || hasChildTextRuns) return null;

  return { kind: 'text', element: textElement };
}

export function attachSlideCanvasAiControls({
  document,
  textActionLabel,
  imageActionLabel,
  onTextAction,
  onImageAction,
  onActiveSlideChange,
}: SlideCanvasAiControlsOptions): SlideCanvasAiControls {
  document
    .querySelectorAll(
      `[${CONTROL_ATTRIBUTE}], style[${CONTROL_STYLE_ATTRIBUTE}]`
    )
    .forEach((element) => {
      element.remove();
    });

  const style = document.createElement('style');
  style.setAttribute(CONTROL_STYLE_ATTRIBUTE, 'true');
  style.textContent = `
    image, img {
      pointer-events: auto !important;
    }
    image:hover, img:hover {
      outline: 1px dashed rgba(59, 130, 246, 0.85) !important;
      outline-offset: 2px;
      cursor: pointer;
    }
    image[data-ai-selected="true"], img[data-ai-selected="true"] {
      outline: 2px solid rgba(139, 92, 246, 0.95) !important;
      outline-offset: 3px;
    }
    [${CONTROL_ATTRIBUTE}] {
      position: absolute;
      display: none;
      align-items: center;
      min-height: 30px;
      max-width: 180px;
      padding: 6px 10px;
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: 8px;
      background: rgba(17, 24, 39, 0.96);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28);
      color: white;
      font: 600 12px/1.2 ui-sans-serif, system-ui, sans-serif;
      letter-spacing: 0.01em;
      white-space: nowrap;
      cursor: pointer;
      z-index: 100001;
    }
    [${CONTROL_ATTRIBUTE}]:hover,
    [${CONTROL_ATTRIBUTE}]:focus-visible {
      background: rgba(30, 41, 59, 0.98);
      outline: 2px solid rgba(139, 92, 246, 0.9);
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute(CONTROL_ATTRIBUTE, 'true');
  document.body.appendChild(button);

  let currentTarget: HoverTarget | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  const cancelHide = () => {
    if (!hideTimer) return;
    clearTimeout(hideTimer);
    hideTimer = null;
  };

  const hide = () => {
    cancelHide();
    currentTarget = null;
    button.style.display = 'none';
  };

  const positionButton = () => {
    if (!currentTarget?.element.isConnected) {
      hide();
      return;
    }

    const rect = currentTarget.element.getBoundingClientRect();
    const view = document.defaultView;
    const scrollX = view?.scrollX ?? 0;
    const scrollY = view?.scrollY ?? 0;
    const viewportWidth = document.documentElement.clientWidth;

    button.style.display = 'inline-flex';
    const buttonWidth = button.offsetWidth;
    const buttonHeight = button.offsetHeight;
    const gap = 8;
    const rightPosition = rect.right + scrollX + gap;
    const leftPosition = rect.left + scrollX - buttonWidth - gap;
    const left =
      rightPosition + buttonWidth <= scrollX + viewportWidth - gap
        ? rightPosition
        : Math.max(scrollX + gap, leftPosition);
    const top = Math.max(
      scrollY + gap,
      rect.top + scrollY + (rect.height - buttonHeight) / 2
    );

    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
  };

  const show = (target: HoverTarget) => {
    cancelHide();
    currentTarget = target;
    const label = target.kind === 'text' ? textActionLabel : imageActionLabel;
    button.textContent = label;
    button.title = label;
    button.setAttribute('aria-label', label);
    positionButton();
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimer = setTimeout(hide, HIDE_DELAY_MS);
  };

  let activeSlide = document.querySelector<HTMLElement>('.slide.active');
  const MutationObserverConstructor = document.defaultView?.MutationObserver;
  const slideObserver = MutationObserverConstructor
    ? new MutationObserverConstructor(() => {
        const nextActiveSlide =
          document.querySelector<HTMLElement>('.slide.active');
        if (nextActiveSlide === activeSlide) return;

        activeSlide = nextActiveSlide;
        hide();
        onActiveSlideChange();
      })
    : null;
  document.querySelectorAll('.slide').forEach((slide) => {
    slideObserver?.observe(slide, {
      attributes: true,
      attributeFilter: ['class'],
    });
  });

  const handleMouseOver = (event: MouseEvent) => {
    const eventElement = event.target as Element | null;
    if (eventElement?.closest?.(`[${CONTROL_ATTRIBUTE}]`)) {
      cancelHide();
      return;
    }

    const target = resolveHoverTarget(document, event.target);
    if (target) show(target);
  };

  const handleMouseOut = (event: MouseEvent) => {
    const relatedElement = event.relatedTarget as Node | null;
    if (
      relatedElement &&
      (button.contains(relatedElement) ||
        currentTarget?.element.contains(relatedElement))
    ) {
      return;
    }
    scheduleHide();
  };

  const handleButtonClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const target = currentTarget;
    hide();
    if (!target?.element.isConnected) return;

    if (target.kind === 'text') {
      onTextAction(target.element);
    } else {
      onImageAction(target.element);
    }
  };

  button.addEventListener('mouseenter', cancelHide);
  button.addEventListener('mouseleave', scheduleHide);
  button.addEventListener('click', handleButtonClick);
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.defaultView?.addEventListener('scroll', positionButton, true);
  document.defaultView?.addEventListener('resize', positionButton);

  return {
    hide,
    cleanup: () => {
      cancelHide();
      slideObserver?.disconnect();
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      document.defaultView?.removeEventListener('scroll', positionButton, true);
      document.defaultView?.removeEventListener('resize', positionButton);
      button.removeEventListener('mouseenter', cancelHide);
      button.removeEventListener('mouseleave', scheduleHide);
      button.removeEventListener('click', handleButtonClick);
      button.remove();
      style.remove();
    },
  };
}
