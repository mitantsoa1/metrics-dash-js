export function buildCssSelector(el: HTMLElement): string {
  if (el.id) {
    return `#${el.id}`;
  }

  let selector = el.tagName.toLowerCase();
  if (el.classList && el.classList.length > 0) {
    const validClasses = Array.from(el.classList)
      .filter((c) => !c.includes(':') && !c.includes('['))
      .slice(0, 3);
    if (validClasses.length > 0) {
      selector += '.' + validClasses.join('.');
    }
  }

  return selector;
}

export function extractSafeLabel(el: HTMLElement): string {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return sanitizeText(ariaLabel);

  const title = el.getAttribute('title');
  if (title) return sanitizeText(title);

  const text = el.innerText || el.textContent || '';
  return sanitizeText(text);
}

export function sanitizeText(text: string): string {
  if (!text) return '';
  let cleaned = text.replace(/\s+/g, ' ').trim();

  // Mask emails
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  // Mask credit cards / numbers of 13-19 digits
  cleaned = cleaned.replace(/\b(?:\d[ -]*?){13,19}\b/g, '[CARD]');

  return cleaned.slice(0, 60);
}

export function isElementIgnored(el: HTMLElement): boolean {
  let current: HTMLElement | null = el;
  while (current && current !== document.body) {
    if (current.getAttribute('data-metrics-ignore') === 'true') {
      return true;
    }
    if (current.tagName === 'INPUT') {
      const type = (current as HTMLInputElement).type?.toLowerCase();
      if (type === 'password' || type === 'credit-card') {
        return true;
      }
    }
    current = current.parentElement;
  }
  return false;
}
