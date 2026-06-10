/**
 * Debounce function to limit the rate at which a function can fire.
 * Useful for search inputs.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function to ensure a function is only called once per specified period.
 * Useful for button clicks to prevent multiple form submissions.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Disables a button and shows a loading state.
 */
export function setButtonLoading(button: HTMLButtonElement, isLoading: boolean, originalText: string) {
  button.disabled = isLoading;
  if (isLoading) {
    button.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Procesando...`;
  } else {
    button.innerHTML = originalText;
  }
}
