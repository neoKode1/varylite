<script lang="ts">
	let selectedFilter = $state('all');
	let fullscreenItem = $state<{ url: string; type: string; prompt: string } | null>(null);

	const filters = ['all', 'images', 'videos', 'characters'] as const;

	// Demo gallery items (in real app, loaded from localStorage/API)
	const galleryItems = [
		{ id: '1', url: 'https://picsum.photos/seed/vary1/600/400', type: 'image', prompt: 'Cyberpunk cityscape at dusk', model: 'Flux Pro', timestamp: Date.now() - 3600000 },
		{ id: '2', url: 'https://picsum.photos/seed/vary2/600/600', type: 'image', prompt: 'Ethereal forest with bioluminescent trees', model: 'Seedream 4', timestamp: Date.now() - 7200000 },
		{ id: '3', url: 'https://picsum.photos/seed/vary3/400/600', type: 'image', prompt: 'Astronaut floating in a nebula', model: 'Nano Banana', timestamp: Date.now() - 10800000 },
		{ id: '4', url: 'https://picsum.photos/seed/vary4/600/400', type: 'image', prompt: 'Japanese garden in autumn', model: 'Gemini Flash', timestamp: Date.now() - 14400000 },
		{ id: '5', url: 'https://picsum.photos/seed/vary5/600/600', type: 'image', prompt: 'Futuristic spaceship interior', model: 'Flux Pro', timestamp: Date.now() - 18000000 },
		{ id: '6', url: 'https://picsum.photos/seed/vary6/400/600', type: 'image', prompt: 'Dragon perched on a crystal mountain', model: 'Ideogram v3', timestamp: Date.now() - 21600000 },
		{ id: '7', url: 'https://picsum.photos/seed/vary7/600/400', type: 'image', prompt: 'Underwater temple ruins', model: 'Seedream 4', timestamp: Date.now() - 25200000 },
		{ id: '8', url: 'https://picsum.photos/seed/vary8/600/600', type: 'image', prompt: 'Steampunk clockwork mechanism', model: 'Nano Banana', timestamp: Date.now() - 28800000 },
		{ id: '9', url: 'https://picsum.photos/seed/vary9/600/400', type: 'image', prompt: 'Northern lights over frozen lake', model: 'Flux Pro', timestamp: Date.now() - 32400000 },
	];

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && fullscreenItem) {
			fullscreenItem = null;
		}
	}

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		const hours = Math.floor(diff / 3600000);
		if (hours < 1) return 'Just now';
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}
</script>

<svelte:head>
	<title>Gallery — vARYLite</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-[100dvh] bg-surface-950">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
		<!-- Header -->
		<div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
			<div>
				<h1 class="text-3xl sm:text-4xl font-bold text-white">Gallery</h1>
				<p class="mt-2 text-surface-400">Browse community creations and get inspired</p>
			</div>
			<div class="flex gap-1 p-1 glass rounded-xl">
				{#each filters as filter}
					<button
						class="px-4 py-2 text-xs font-medium rounded-lg capitalize transition-all
							{selectedFilter === filter ? 'bg-white/10 text-white' : 'text-surface-500 hover:text-surface-300'}"
						onclick={() => selectedFilter = filter}
					>
						{filter}
					</button>
				{/each}
			</div>
		</div>

		<!-- Masonry grid -->
		<div class="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
			{#each galleryItems as item, i}
				<div
					class="break-inside-avoid group animate-slide-up"
					style="animation-delay: {i * 0.05}s;"
				>
					<button
						class="relative w-full rounded-xl overflow-hidden border border-white/5 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 block"
						onclick={() => fullscreenItem = { url: item.url, type: item.type, prompt: item.prompt }}
					>
						<img
							src={item.url}
							alt={item.prompt}
							class="w-full h-auto block"
							loading="lazy"
						/>
						<!-- Hover overlay -->
						<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
							<div class="absolute bottom-0 left-0 right-0 p-4">
								<p class="text-sm text-white line-clamp-2">{item.prompt}</p>
								<div class="flex items-center justify-between mt-2">
									<span class="text-[10px] text-white/50 uppercase tracking-wider">{item.model}</span>
									<span class="text-[10px] text-white/40">{timeAgo(item.timestamp)}</span>
								</div>
							</div>
						</div>
					</button>
				</div>
			{/each}
		</div>

		<!-- Empty state -->
		{#if galleryItems.length === 0}
			<div class="text-center py-24">
				<div class="w-20 h-20 mx-auto rounded-2xl border border-dashed border-white/20 flex items-center justify-center mb-6">
					<svg class="w-10 h-10 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"/>
					</svg>
				</div>
				<h3 class="text-lg font-medium text-surface-300">No creations yet</h3>
				<p class="mt-2 text-sm text-surface-500">Generate your first scene to see it here</p>
				<a href="/generate" class="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-white text-surface-950 font-semibold text-sm rounded-xl hover:bg-surface-100 transition-colors">
					Start Creating
				</a>
			</div>
		{/if}
	</div>
</div>

<!-- Fullscreen viewer -->
{#if fullscreenItem}
	<div class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" role="dialog" aria-modal="true">
		<button
			class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
			onclick={() => fullscreenItem = null}
			aria-label="Close"
		>
			<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
		</button>
		<div class="max-w-5xl w-full">
			<img src={fullscreenItem.url} alt={fullscreenItem.prompt} class="w-full h-auto max-h-[80vh] object-contain rounded-lg mx-auto" />
			<p class="mt-4 text-center text-sm text-surface-400">{fullscreenItem.prompt}</p>
		</div>
	</div>
{/if}
