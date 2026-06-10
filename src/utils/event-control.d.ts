/**
 * Debounce function to limit the rate at which a function can fire.
 * Useful for search inputs.
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * Throttle function to ensure a function is only called once per specified period.
 * Useful for button clicks to prevent multiple form submissions.
 */
export declare function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
/**
 * Disables a button and shows a loading state.
 */
export declare function setButtonLoading(button: HTMLButtonElement, isLoading: boolean, originalText: string): void;
//# sourceMappingURL=event-control.d.ts.map