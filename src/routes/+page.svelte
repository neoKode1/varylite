<script lang="ts">
	let currentModel = $state(0);
	let activeFeature = $state(0);

	const models = [
		{ name: 'Nano Banana', type: 'Image Edit', icon: '🖼️' },
		{ name: 'Veo 3 Fast', type: 'Text → Video', icon: '🎬' },
		{ name: 'MiniMax 2.0', type: 'Video Gen', icon: '🎥' },
		{ name: 'Seedream 4', type: 'Image Gen', icon: '🌱' },
		{ name: 'Runway Gen-3', type: 'Video Gen', icon: '🛤️' },
		{ name: 'Kling Avatar', type: 'Avatar', icon: '👤' },
	];

	const features = [
		{
			title: 'Text to Image',
			description: 'Describe your vision and watch it come to life with cutting-edge diffusion models.',
			icon: `<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"/></svg>`,
			color: 'from-violet-500/20 to-purple-600/20',
			borderColor: 'border-violet-500/20',
			iconBg: 'bg-violet-500/10',
			iconColor: 'text-violet-400',
		},
		{
			title: 'Text to Video',
			description: 'Generate cinematic videos from simple text prompts with Veo 3, MiniMax, and Runway.',
			icon: `<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-2.625 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m1.125-2.625c0-.621-.504-1.125-1.125-1.125M4.875 15.75h1.5"/></svg>`,
			color: 'from-cyan-500/20 to-blue-600/20',
			borderColor: 'border-cyan-500/20',
			iconBg: 'bg-cyan-500/10',
			iconColor: 'text-cyan-400',
		},
		{
			title: 'Image to Video',
			description: 'Animate any still image into fluid, natural motion video with a single click.',
			icon: `<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"/></svg>`,
			color: 'from-emerald-500/20 to-teal-600/20',
			borderColor: 'border-emerald-500/20',
			iconBg: 'bg-emerald-500/10',
			iconColor: 'text-emerald-400',
		},
		{
			title: 'Character Variations',
			description: 'Generate consistent character views from multiple angles and in different styles.',
			icon: `<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>`,
			color: 'from-rose-500/20 to-pink-600/20',
			borderColor: 'border-rose-500/20',
			iconBg: 'bg-rose-500/10',
			iconColor: 'text-rose-400',
		},
		{
			title: 'Lip Sync',
			description: 'Sync audio to any face in your videos for realistic talking head content.',
			icon: `<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"/></svg>`,
			color: 'from-amber-500/20 to-orange-600/20',
			borderColor: 'border-amber-500/20',
			iconBg: 'bg-amber-500/10',
			iconColor: 'text-amber-400',
		},
		{
			title: 'Browser Storage',
			description: 'Your creations stay in your browser. No account needed, no data on our servers.',
			icon: `<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>`,
			color: 'from-blue-500/20 to-indigo-600/20',
			borderColor: 'border-blue-500/20',
			iconBg: 'bg-blue-500/10',
			iconColor: 'text-blue-400',
		},
	];

	const stats = [
		{ value: '70+', label: 'AI Models', icon: '⚡' },
		{ value: 'Free', label: 'To Start', icon: '🎉' },
		{ value: '0', label: 'Sign-ups Required', icon: '🔓' },
		{ value: '24/7', label: 'Available', icon: '🌐' },
	];

	const providers = [
		{ name: 'Flux', category: 'Image', color: 'text-violet-400' },
		{ name: 'Veo 3', category: 'Video', color: 'text-cyan-400' },
		{ name: 'MiniMax', category: 'Video', color: 'text-cyan-400' },
		{ name: 'Runway', category: 'Video', color: 'text-cyan-400' },
		{ name: 'Kling', category: 'Avatar', color: 'text-rose-400' },
		{ name: 'Gemini', category: 'Edit', color: 'text-emerald-400' },
		{ name: 'DALL-E', category: 'Image', color: 'text-violet-400' },
		{ name: 'Seedream', category: 'Image', color: 'text-violet-400' },
		{ name: 'Pika', category: 'Video', color: 'text-cyan-400' },
		{ name: 'Replicate', category: 'Multi', color: 'text-amber-400' },
		{ name: 'ElevenLabs', category: 'Audio', color: 'text-emerald-400' },
		{ name: 'Ideogram', category: 'Image', color: 'text-violet-400' },
	];

	$effect(() => {
		const interval = setInterval(() => {
			currentModel = (currentModel + 1) % models.length;
		}, 2500);
		return () => clearInterval(interval);
	});

	$effect(() => {
		const interval = setInterval(() => {
			activeFeature = (activeFeature + 1) % features.length;
		}, 4000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>vARYLite — Free AI Scene Generator</title>
</svelte:head>

<!-- ═══ Hero ═══ -->
<section class="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
	<!-- Ambient background with orbs -->
	<div class="absolute inset-0">
		<div class="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950/95 to-surface-900"></div>
		<!-- Floating orbs -->
		<div class="absolute top-[15%] left-[20%] w-[500px] h-[500px] rounded-full bg-accent-600/15 blur-[140px]" style="animation: orbFloat1 12s ease-in-out infinite;"></div>
		<div class="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] rounded-full bg-cyan-400/10 blur-[120px]" style="animation: orbFloat2 15s ease-in-out infinite;"></div>
		<div class="absolute top-[60%] left-[60%] w-[350px] h-[350px] rounded-full bg-blue-500/8 blur-[100px] animate-pulse-glow"></div>
		<!-- Grid pattern -->
		<div class="absolute inset-0 opacity-[0.025]" style="background-image: linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px); background-size: 72px 72px;"></div>
		<!-- Radial vignette -->
		<div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.4)_70%,rgba(2,6,23,0.8)_100%)]"></div>
	</div>

	<div class="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 text-center">
		<!-- Status badge -->
		<div class="inline-flex items-center gap-2.5 px-5 py-2 rounded-full glass text-xs font-semibold text-surface-300 mb-10 animate-fade-in tracking-wide">
			<span class="relative flex h-2 w-2">
				<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
				<span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
			</span>
			AI-Powered Scene Generation
		</div>

		<!-- HEADLINE — Significantly bigger (user asked for "two inches bigger") -->
		<h1 class="animate-blur-in" style="animation-delay: 0.1s;">
			<span class="block text-[4.5rem] sm:text-[7rem] lg:text-[9rem] xl:text-[10.5rem] font-black tracking-tighter leading-[0.85] text-white" style="animation: textGlow 4s ease-in-out infinite;">
				IMAGINE
			</span>
			<span class="block text-[4.5rem] sm:text-[7rem] lg:text-[9rem] xl:text-[10.5rem] font-black tracking-tighter leading-[0.85] gradient-text mt-2">
				YOUR WORLD
			</span>
		</h1>

		<p class="mt-8 text-lg sm:text-xl lg:text-2xl text-surface-400 max-w-2xl mx-auto leading-relaxed animate-slide-up text-balance" style="animation-delay: 0.2s;">
			The free AI app made for creation by creators. Generate stunning images and videos
			with <span class="text-white font-semibold">70+ models</span> — no sign-up required.
		</p>

		<!-- CTA group -->
		<div class="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5 animate-slide-up" style="animation-delay: 0.3s;">
			<a
				href="/generate"
				class="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-accent-600 to-accent-500 text-white font-bold text-lg rounded-2xl transition-all duration-300 hover:scale-[1.03] shadow-2xl shadow-accent-600/25 hover:shadow-accent-500/40"
			>
				<span>Start Creating</span>
				<svg class="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
				<div class="absolute inset-0 rounded-2xl shimmer-bg pointer-events-none"></div>
			</a>
			<a
				href="/gallery"
				class="group inline-flex items-center gap-2 px-10 py-5 text-surface-300 hover:text-white font-semibold text-lg rounded-2xl border border-white/10 hover:border-accent-500/30 hover:bg-white/[0.04] transition-all duration-300"
			>
				<svg class="w-5 h-5 text-surface-500 group-hover:text-accent-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"/></svg>
				View Gallery
			</a>
		</div>

		<!-- Rotating model display -->
		<div class="mt-20 animate-slide-up" style="animation-delay: 0.45s;">
			<p class="text-xs text-surface-500 uppercase tracking-[0.2em] mb-5 font-medium">Powered by</p>
			<div class="flex flex-wrap justify-center gap-3">
				{#each models as model, i}
					<button
						class="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-500
							{i === currentModel
								? 'glass glow-border text-white scale-105'
								: 'text-surface-500 hover:text-surface-300 bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/5'}"
						onclick={() => currentModel = i}
					>
						<span class="mr-1.5">{model.icon}</span>
						{model.name}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Scroll indicator -->
	<div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce-soft">
		<span class="text-[10px] text-surface-600 uppercase tracking-[0.2em] font-medium">Scroll</span>
		<svg class="w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
			<path d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
		</svg>
	</div>
</section>

<!-- ═══ Stats bar ═══ -->
<section class="relative border-y border-white/[0.04] overflow-hidden">
	<div class="absolute inset-0 bg-gradient-to-r from-surface-950 via-surface-900/50 to-surface-950"></div>
	<div class="relative mx-auto max-w-6xl px-4 sm:px-6 py-16">
		<div class="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
			{#each stats as stat, i}
				<div class="text-center animate-slide-up group" style="animation-delay: {i * 0.08}s;">
					<div class="text-2xl mb-3 group-hover:scale-125 transition-transform duration-300">{stat.icon}</div>
					<p class="text-4xl sm:text-5xl font-black text-white tracking-tight">{stat.value}</p>
					<p class="mt-2 text-sm text-surface-500 font-medium">{stat.label}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ═══ Features ═══ -->
<section class="relative py-28 sm:py-36 overflow-hidden">
	<!-- Section background -->
	<div class="absolute inset-0 hero-glow opacity-40"></div>

	<div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="text-center mb-20">
			<span class="inline-block px-4 py-1.5 rounded-full bg-accent-600/10 border border-accent-500/20 text-accent-400 text-xs font-semibold uppercase tracking-widest mb-6">Capabilities</span>
			<h2 class="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">Everything You Need to Create</h2>
			<p class="mt-6 text-lg text-surface-400 max-w-2xl mx-auto text-balance leading-relaxed">
				From text prompts to fully animated scenes, vARYLite gives you access
				to the most powerful AI generation tools — for free.
			</p>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
			{#each features as feature, i}
				<div
					class="group relative p-7 rounded-2xl glass-card hover:bg-white/[0.06] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-accent-600/5 animate-slide-up"
					style="animation-delay: {i * 0.07}s;"
				>
					<!-- Hover glow -->
					<div class="absolute inset-0 rounded-2xl bg-gradient-to-br {feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

					<div class="relative">
						<!-- Icon -->
						<div class="w-14 h-14 rounded-2xl {feature.iconBg} border {feature.borderColor} flex items-center justify-center {feature.iconColor} mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
							{@html feature.icon}
						</div>
						<h3 class="text-xl font-bold text-white mb-3">{feature.title}</h3>
						<p class="text-sm text-surface-400 leading-relaxed">{feature.description}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ═══ How It Works ═══ -->
<section class="relative py-28 sm:py-36 border-t border-white/[0.04] overflow-hidden">
	<div class="absolute inset-0 mesh-gradient opacity-30"></div>

	<div class="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
		<div class="text-center mb-20">
			<span class="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-widest mb-6">How It Works</span>
			<h2 class="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">Three Steps to Magic</h2>
			<p class="mt-6 text-lg text-surface-400">Your first creation is moments away</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
			{#each [
				{ step: '01', title: 'Upload or Describe', desc: 'Drop in reference images or write a detailed text prompt describing your scene.', gradient: 'from-violet-500 to-purple-600' },
				{ step: '02', title: 'Choose Your Model', desc: 'Pick from 70+ AI models optimized for images, videos, avatars, and more.', gradient: 'from-cyan-500 to-blue-600' },
				{ step: '03', title: 'Generate & Download', desc: 'Hit generate and download your creation. Everything is saved in your browser.', gradient: 'from-emerald-500 to-teal-600' },
			] as item, i}
				<div class="relative text-center animate-slide-up group" style="animation-delay: {i * 0.12}s;">
					<!-- Connector line (desktop only) -->
					{#if i < 2}
						<div class="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gradient-to-r from-white/10 to-transparent"></div>
					{/if}

					<div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br {item.gradient} mb-8 group-hover:scale-110 group-hover:shadow-lg transition-all duration-500">
						<span class="text-2xl font-black text-white">{item.step}</span>
					</div>
					<h3 class="text-xl font-bold text-white mb-3">{item.title}</h3>
					<p class="text-sm text-surface-400 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ═══ Model showcase ═══ -->
<section class="relative py-28 sm:py-36 border-t border-white/[0.04] overflow-hidden">
	<div class="absolute inset-0 bg-gradient-to-b from-surface-900/30 via-surface-950 to-surface-950"></div>

	<div class="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
		<div class="text-center mb-20">
			<span class="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-6">Integrations</span>
			<h2 class="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">Powered by the Best Models</h2>
			<p class="mt-6 text-lg text-surface-400">Access premium AI from top providers, all in one place.</p>
		</div>

		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
			{#each providers as provider, i}
				<div
					class="group flex flex-col items-center gap-3 p-5 rounded-2xl glass-card hover:border-white/15 hover:bg-white/[0.06] transition-all duration-500 hover:-translate-y-1 hover:shadow-lg animate-scale-in cursor-default"
					style="animation-delay: {i * 0.04}s;"
				>
					<span class="text-sm font-bold {provider.color} group-hover:text-white transition-colors duration-300">{provider.name}</span>
					<span class="text-[10px] text-surface-600 uppercase tracking-wider font-medium">{provider.category}</span>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ═══ CTA ═══ -->
<section class="relative py-28 sm:py-36 border-t border-white/[0.04] overflow-hidden">
	<!-- Ambient glow -->
	<div class="absolute inset-0">
		<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent-600/10 blur-[150px]"></div>
	</div>

	<div class="relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
		<h2 class="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[0.95] tracking-tight">
			Ready to Create<br />
			<span class="gradient-text">Something Amazing?</span>
		</h2>
		<p class="mt-8 text-lg sm:text-xl text-surface-400 max-w-xl mx-auto text-balance leading-relaxed">
			No sign-up. No credit card. Just open and start creating
			with the most powerful AI tools available.
		</p>
		<div class="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5">
			<a
				href="/generate"
				class="group relative inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-accent-600 to-accent-500 text-white font-bold text-xl rounded-2xl transition-all duration-300 hover:scale-[1.03] shadow-2xl shadow-accent-600/25 hover:shadow-accent-500/40"
			>
				<span>Start vARYLite</span>
				<svg class="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
				<div class="absolute inset-0 rounded-2xl shimmer-bg pointer-events-none"></div>
			</a>
			<a
				href="/pricing"
				class="inline-flex items-center gap-2 px-8 py-5 text-surface-400 hover:text-white font-medium text-lg transition-all duration-300 hover:bg-white/[0.04] rounded-2xl border border-white/5 hover:border-white/10"
			>
				View Pricing
			</a>
		</div>
	</div>
</section>
