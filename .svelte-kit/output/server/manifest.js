export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["2025-08-28T20-27-35_generation.mp4","47debd1b-0cb8-42c2-aeed-f6390e223238.mp4","561a19e8-94f1-482a-81b5-2c3a8181afb7.mp4","91b9d7be-bb33-4df3-af75-85c7bc3f9d79.mp4","Gen4.png","Hailuo_Video_419969345664200707.mp4","Hailuo_Video_420663603060797440.mp4","Hailuo_Video_A black hole forming, showing _422670144136040456.mp4","Hailuo_Video_A dark, cosmic horror-like the_422674688974839808.mp4","Hailuo_Video_Floating through the void of s_422665777454579718.mp4","Hailuo_Video_This guy laughs like a maniac_416571478244982786.mp4","Screenshot (2488).png","TOASTY SOUND EFFECT (MORTAL KOMBAT).mp3","Toasty_mk3.JPG.webp","adarkorchestra_28188_In_the_style_of_glitch_transcendental_co_657b00f6-f6c5-41b4-8e19-425331e21112_1.png","adarkorchestra_28188_The_interior_of_a_retro-futuristic_space_638ede4d-ca7f-45f3-9dc8-2fd97f905591_0.png","b39d569d-2c0e-4f3a-9ff0-d0d58b7a185d_removalai_preview.png","background-smileys.svg","bytedance-color.svg","character-variation-1-variation-1.jpg","character-variation-2-variation-2.jpg","download.svg","dreammachine.png","elevenlabs.png","elevenlabs.svg","f63ea944-d2e1-479d-98a0-590a0b18ad3f.mp4","flux.png","flux.svg","gemini-color.png","gemini-color.svg","ideogram.png","ideogram.svg","kling-color.png","kling-color.svg","minimax-color.png","minimax-color.svg"]),
	mimeTypes: {".mp4":"video/mp4",".png":"image/png",".mp3":"audio/mpeg",".webp":"image/webp",".svg":"image/svg+xml",".jpg":"image/jpeg"},
	_: {
		client: {start:"_app/immutable/entry/start.DqmMN3Lb.js",app:"_app/immutable/entry/app.NAzaRmZ4.js",imports:["_app/immutable/entry/start.DqmMN3Lb.js","_app/immutable/chunks/CfyUHIh_.js","_app/immutable/chunks/_DvXJwMr.js","_app/immutable/chunks/CFIxMO8Q.js","_app/immutable/entry/app.NAzaRmZ4.js","_app/immutable/chunks/_DvXJwMr.js","_app/immutable/chunks/aaURGKqg.js","_app/immutable/chunks/CFIxMO8Q.js","_app/immutable/chunks/DtP8UV3L.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/community",
				pattern: /^\/community\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/gallery",
				pattern: /^\/gallery\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/generate",
				pattern: /^\/generate\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/pricing",
				pattern: /^\/pricing\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
