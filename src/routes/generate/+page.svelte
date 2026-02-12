<script lang="ts">
	let prompt = $state('');
	let negativePrompt = $state('');
	let showNegative = $state(false);
	let selectedModel = $state('nano-banana');
	let selectedMode = $state<'text-to-image' | 'text-to-video' | 'image-to-video'>('text-to-image');
	let isGenerating = $state(false);
	let uploadedFiles = $state<File[]>([]);
	let generations = $state<Array<{ id: string; prompt: string; url: string; type: 'image' | 'video'; model: string; timestamp: number }>>([]);
	let dragOver = $state(false);
	let fullscreenItem = $state<{ url: string; type: 'image' | 'video' } | null>(null);

	const modelGroups = {
		'text-to-image': [
			{ id: 'nano-banana', name: 'Nano Banana', credits: 3 },
			{ id: 'seedream-4', name: 'Seedream 4', credits: 5 },
			{ id: 'flux-pro', name: 'Flux Pro', credits: 6 },
			{ id: 'gemini-flash', name: 'Gemini Flash Edit', credits: 2 },
			{ id: 'ideogram-v3', name: 'Ideogram v3', credits: 5 },
		],
		'text-to-video': [
			{ id: 'minimax-2', name: 'MiniMax 2.0', credits: 10 },
			{ id: 'veo3-fast', name: 'Veo 3 Fast', credits: 12 },
			{ id: 'runway-gen3', name: 'Runway Gen-3', credits: 15 },
			{ id: 'seedance-pro', name: 'Seedance Pro', credits: 10 },
		],
		'image-to-video': [
			{ id: 'minimax-i2v', name: 'MiniMax I2V', credits: 10 },
			{ id: 'kling-avatar', name: 'Kling Avatar', credits: 15 },
			{ id: 'runway-i2v', name: 'Runway I2V', credits: 15 },
		],
	};

	const availableModels = $derived(modelGroups[selectedMode]);

	$effect(() => {
		selectedModel = modelGroups[selectedMode][0].id;
	});

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (e.dataTransfer?.files) {
			uploadedFiles = [...uploadedFiles, ...Array.from(e.dataTransfer.files)];
		}
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			uploadedFiles = [...uploadedFiles, ...Array.from(input.files)];
		}
	}

	function removeFile(index: number) {
		uploadedFiles = uploadedFiles.filter((_, i) => i !== index);
	}

	function handleGenerate() {
		if (!prompt.trim() && uploadedFiles.length === 0) return;
		isGenerating = true;

		// Simulate generation (in real app, this calls the API)
		setTimeout(() => {
			const newGen = {
				id: crypto.randomUUID(),
				prompt: prompt || 'Uploaded image generation',
				url: `https://picsum.photos/seed/${Date.now()}/800/600`,
				type: 'image' as const,
				model: selectedModel,
				timestamp: Date.now(),
			};
			generations = [newGen, ...generations];
			isGenerating = false;
		}, 3000);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && fullscreenItem) {
			fullscreenItem = null;
		}
	}
</script>

<svelte:head>
	<title>Generate — vARYLite</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-[100dvh] bg-surface-950">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
		<div class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

			<!-- ═══ Main canvas area ═══ -->
			<div class="space-y-6">
				<!-- Generation display / upload zone -->
				<div
					class="relative aspect-[4/3] lg:aspect-[16/10] rounded-2xl overflow-hidden border transition-all duration-300
						{dragOver ? 'border-accent-500 bg-accent-600/5' : 'border-white/10 bg-surface-900/50'}"
					role="region"
					aria-label="Generation display"
					ondragover={(e) => { e.preventDefault(); dragOver = true; }}
					ondragleave={() => dragOver = false}
					ondrop={handleDrop}
				>
					{#if isGenerating}
						<!-- Loading state -->
						<div class="absolute inset-0 flex flex-col items-center justify-center gap-4">
							<div class="relative w-16 h-16">
								<div class="absolute inset-0 rounded-full border-2 border-accent-500/30 animate-ping"></div>
								<div class="absolute inset-2 rounded-full border-2 border-t-accent-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
								<div class="absolute inset-4 rounded-full bg-accent-500/20"></div>
							</div>
							<p class="text-sm text-surface-400">Generating with {selectedModel}...</p>
						</div>
					{:else if generations.length > 0}
						<!-- Latest generation -->
						{@const latest = generations[0]}
						<button
							class="w-full h-full"
							onclick={() => fullscreenItem = { url: latest.url, type: latest.type }}
						>
							{#if latest.type === 'video'}
								<video src={latest.url} class="w-full h-full object-cover animate-blur-in" autoplay loop muted playsinline></video>
							{:else}
								<img src={latest.url} alt={latest.prompt} class="w-full h-full object-cover animate-blur-in" />
							{/if}
						</button>
						<div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
							<p class="text-sm text-white/90 line-clamp-1">{latest.prompt}</p>
							<p class="text-xs text-white/50 mt-1">{latest.model}</p>
						</div>
					{:else}
						<!-- Empty / upload prompt -->
						<label class="absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer">
							<div class="w-16 h-16 rounded-2xl border border-dashed border-white/20 flex items-center justify-center text-surface-500">
								<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path d="M12 4.5v15m7.5-7.5h-15" />
								</svg>
							</div>
							<div class="text-center">
								<p class="text-sm font-medium text-surface-300">Drop images here or click to upload</p>
								<p class="text-xs text-surface-500 mt-1">Or type a prompt below to generate from text</p>
							</div>
							<input type="file" accept="image/*,video/*" multiple class="hidden" onchange={handleFileInput} />
						</label>
					{/if}
				</div>

				<!-- Uploaded files -->
				{#if uploadedFiles.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each uploadedFiles as file, i}
							<div class="relative group">
								<div class="w-16 h-16 rounded-lg bg-surface-800 border border-white/10 overflow-hidden">
									{#if file.type.startsWith('image/')}
										<img src={URL.createObjectURL(file)} alt={file.name} class="w-full h-full object-cover" />
									{:else}
										<div class="w-full h-full flex items-center justify-center text-xs text-surface-400">
											{file.name.split('.').pop()?.toUpperCase()}
										</div>
									{/if}
								</div>
								<button
									class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
									onclick={() => removeFile(i)}
								>
									&times;
								</button>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Generation history -->
				{#if generations.length > 1}
					<div>
						<h3 class="text-sm font-medium text-surface-400 mb-3">Recent Generations</h3>
						<div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
							{#each generations.slice(1, 13) as gen}
								<button
									class="aspect-square rounded-lg overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:scale-105"
									onclick={() => fullscreenItem = { url: gen.url, type: gen.type }}
								>
									<img src={gen.url} alt={gen.prompt} class="w-full h-full object-cover" />
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- ═══ Controls panel ═══ -->
			<div class="space-y-5">
				<!-- Mode selector -->
				<div class="glass rounded-xl p-1 flex gap-1">
					{#each [
						{ id: 'text-to-image' as const, label: 'Text → Image' },
						{ id: 'text-to-video' as const, label: 'Text → Video' },
						{ id: 'image-to-video' as const, label: 'Image → Video' },
					] as mode}
						<button
							class="flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all
								{selectedMode === mode.id ? 'bg-white/10 text-white' : 'text-surface-500 hover:text-surface-300'}"
							onclick={() => selectedMode = mode.id}
						>
							{mode.label}
						</button>
					{/each}
				</div>

				<!-- Model selector -->
				<div class="glass rounded-xl p-4 space-y-3">
					<label for="model-select" class="text-xs font-medium text-surface-400 uppercase tracking-wider">Model</label>
					<select
						id="model-select"
						bind:value={selectedModel}
						class="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500/50"
					>
						{#each availableModels as model}
							<option value={model.id}>{model.name} — {model.credits} credits</option>
						{/each}
					</select>
				</div>

				<!-- Prompt input -->
				<div class="glass rounded-xl p-4 space-y-3">
					<label for="prompt-input" class="text-xs font-medium text-surface-400 uppercase tracking-wider">Prompt</label>
					<textarea
						id="prompt-input"
						bind:value={prompt}
						placeholder="Describe your scene in detail..."
						rows={4}
						class="w-full bg-surface-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500/50 resize-none"
					></textarea>

					<!-- Negative prompt toggle -->
					<button
						class="text-xs text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1"
						onclick={() => showNegative = !showNegative}
					>
						<svg class="w-3 h-3 transition-transform {showNegative ? 'rotate-90' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
						</svg>
						Things to avoid
					</button>
					{#if showNegative}
						<textarea
							bind:value={negativePrompt}
							placeholder="Elements to exclude..."
							rows={2}
							class="w-full bg-surface-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-accent-500/50 resize-none"
						></textarea>
					{/if}
				</div>

				<!-- Generate button -->
				<button
					class="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2
						{isGenerating
							? 'bg-surface-800 text-surface-500 cursor-not-allowed'
							: 'bg-white text-surface-950 hover:bg-surface-100 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/10'}"
					disabled={isGenerating}
					onclick={handleGenerate}
				>
					{#if isGenerating}
						<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" class="opacity-75"/></svg>
						Generating...
					{:else}
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"/></svg>
						Generate
					{/if}
				</button>

				<!-- Quick tips -->
				<div class="glass rounded-xl p-4">
					<h4 class="text-xs font-medium text-surface-400 uppercase tracking-wider mb-3">Quick Tips</h4>
					<ul class="space-y-2 text-xs text-surface-500">
						<li class="flex gap-2">
							<span class="text-accent-400 flex-shrink-0">-</span>
							<span>Be specific: describe lighting, camera angle, mood</span>
						</li>
						<li class="flex gap-2">
							<span class="text-accent-400 flex-shrink-0">-</span>
							<span>Upload reference images for character consistency</span>
						</li>
						<li class="flex gap-2">
							<span class="text-accent-400 flex-shrink-0">-</span>
							<span>Use negative prompts to avoid unwanted elements</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- ═══ Fullscreen modal ═══ -->
{#if fullscreenItem}
	<div
		class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
	>
		<button
			class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
			onclick={() => fullscreenItem = null}
			aria-label="Close fullscreen"
		>
			<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
		</button>
		{#if fullscreenItem.type === 'video'}
			<video src={fullscreenItem.url} class="max-w-full max-h-full rounded-lg" autoplay loop muted playsinline controls></video>
		{:else}
			<img src={fullscreenItem.url} alt="Fullscreen view" class="max-w-full max-h-full rounded-lg object-contain" />
		{/if}
	</div>
{/if}
