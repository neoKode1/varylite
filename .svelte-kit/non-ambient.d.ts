
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/community" | "/gallery" | "/generate" | "/pricing";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/community": Record<string, never>;
			"/gallery": Record<string, never>;
			"/generate": Record<string, never>;
			"/pricing": Record<string, never>
		};
		Pathname(): "/" | "/community" | "/community/" | "/gallery" | "/gallery/" | "/generate" | "/generate/" | "/pricing" | "/pricing/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/2025-08-28T20-27-35_generation.mp4" | "/47debd1b-0cb8-42c2-aeed-f6390e223238.mp4" | "/561a19e8-94f1-482a-81b5-2c3a8181afb7.mp4" | "/91b9d7be-bb33-4df3-af75-85c7bc3f9d79.mp4" | "/Gen4.png" | "/Hailuo_Video_419969345664200707.mp4" | "/Hailuo_Video_420663603060797440.mp4" | "/Hailuo_Video_A black hole forming, showing _422670144136040456.mp4" | "/Hailuo_Video_A dark, cosmic horror-like the_422674688974839808.mp4" | "/Hailuo_Video_Floating through the void of s_422665777454579718.mp4" | "/Hailuo_Video_This guy laughs like a maniac_416571478244982786.mp4" | "/Screenshot (2488).png" | "/TOASTY SOUND EFFECT (MORTAL KOMBAT).mp3" | "/Toasty_mk3.JPG.webp" | "/adarkorchestra_28188_In_the_style_of_glitch_transcendental_co_657b00f6-f6c5-41b4-8e19-425331e21112_1.png" | "/adarkorchestra_28188_The_interior_of_a_retro-futuristic_space_638ede4d-ca7f-45f3-9dc8-2fd97f905591_0.png" | "/b39d569d-2c0e-4f3a-9ff0-d0d58b7a185d_removalai_preview.png" | "/background-smileys.svg" | "/bytedance-color.svg" | "/character-variation-1-variation-1.jpg" | "/character-variation-2-variation-2.jpg" | "/download.svg" | "/dreammachine.png" | "/elevenlabs.png" | "/elevenlabs.svg" | "/f63ea944-d2e1-479d-98a0-590a0b18ad3f.mp4" | "/flux.png" | "/flux.svg" | "/gemini-color.png" | "/gemini-color.svg" | "/ideogram.png" | "/ideogram.svg" | "/kling-color.png" | "/kling-color.svg" | "/minimax-color.png" | "/minimax-color.svg" | string & {};
	}
}