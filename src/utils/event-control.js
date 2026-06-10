/**
 * Debounce function to limit the rate at which a function can fire.
 * Useful for search inputs.
 */
export function debounce(func, wait) {
    let timeout = null;
    return (...args) => {
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}
/**
 * Throttle function to ensure a function is only called once per specified period.
 * Useful for button clicks to prevent multiple form submissions.
 */
export function throttle(func, limit) {
    let inThrottle;
    return (...args) => {
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
export function setButtonLoading(button, isLoading, originalText) {
    button.disabled = isLoading;
    if (isLoading) {
        button.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Procesando...`;
    }
    else {
        button.innerHTML = originalText;
    }
}
//# sourceMappingURL=event-control.js.map