import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
	window.matchMedia = (query: string): MediaQueryList => {
		const listeners = new Set<(event: MediaQueryListEvent) => void>();

		return {
			matches: false,
			media: query,
			onchange: null,
			addListener: (_listener: (this: MediaQueryList, ev: MediaQueryListEvent) => any) => {
				// Deprecated API retained for compatibility with some dependencies.
			},
			removeListener: (_listener: (this: MediaQueryList, ev: MediaQueryListEvent) => any) => {
				// Deprecated API retained for compatibility with some dependencies.
			},
			addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
				if (typeof listener === "function") {
					listeners.add(listener as (event: MediaQueryListEvent) => void);
				}
			},
			removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
				if (typeof listener === "function") {
					listeners.delete(listener as (event: MediaQueryListEvent) => void);
				}
			},
			dispatchEvent: (event: Event) => {
				listeners.forEach((listener) => {
					listener(event as MediaQueryListEvent);
				});
				return true;
			}
		};
	};
}

afterEach(() => {
	cleanup();
});
