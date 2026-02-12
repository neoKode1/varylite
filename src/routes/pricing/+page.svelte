<script lang="ts">
	let annual = $state(false);

	const tiers = [
		{
			name: 'Free',
			price: 0,
			annualPrice: 0,
			description: 'Get started with AI generation at no cost',
			features: [
				'Unlimited Nano Banana generations',
				'5 premium model uses per month',
				'Browser-based storage',
				'Basic aspect ratios',
				'Community access',
			],
			cta: 'Start Free',
			highlighted: false,
		},
		{
			name: 'Light',
			price: 14.99,
			annualPrice: 9.99,
			description: 'For creators who need more power',
			features: [
				'50 monthly generations',
				'All image models unlocked',
				'Video generation access',
				'All aspect ratios',
				'Priority generation queue',
				'Download in full quality',
			],
			cta: 'Get Light',
			highlighted: true,
		},
		{
			name: 'Heavy',
			price: 19.99,
			annualPrice: 14.99,
			description: 'Unlimited creation for serious creators',
			features: [
				'100 monthly generations',
				'All 70+ models unlocked',
				'Advanced video models (Veo 3, Runway)',
				'Character variations',
				'Lip sync generation',
				'Priority support',
				'Early access to new models',
			],
			cta: 'Get Heavy',
			highlighted: false,
		},
	];

	const creditPacks = [
		{ amount: 50, price: 1.99 },
		{ amount: 150, price: 4.99 },
		{ amount: 350, price: 9.99 },
		{ amount: 800, price: 19.99 },
		{ amount: 2200, price: 49.99 },
	];
</script>

<svelte:head>
	<title>Pricing — vARYLite</title>
</svelte:head>

<div class="min-h-[100dvh] bg-surface-950">
	<div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
		<!-- Header -->
		<div class="text-center mb-16">
			<h1 class="text-3xl sm:text-5xl font-bold text-white">Simple, Transparent Pricing</h1>
			<p class="mt-4 text-lg text-surface-400 max-w-xl mx-auto text-balance">
				Start free. Upgrade when you need more. No hidden fees.
			</p>

			<!-- Toggle -->
			<div class="mt-8 inline-flex items-center gap-3 p-1 glass rounded-full">
				<button
					class="px-4 py-2 text-sm font-medium rounded-full transition-all
						{!annual ? 'bg-white/10 text-white' : 'text-surface-500 hover:text-surface-300'}"
					onclick={() => annual = false}
				>
					Monthly
				</button>
				<button
					class="px-4 py-2 text-sm font-medium rounded-full transition-all
						{annual ? 'bg-white/10 text-white' : 'text-surface-500 hover:text-surface-300'}"
					onclick={() => annual = true}
				>
					Annual
					<span class="ml-1.5 text-[10px] text-emerald-400 font-semibold">Save 33%</span>
				</button>
			</div>
		</div>

		<!-- Pricing cards -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
			{#each tiers as tier, i}
				<div
					class="relative rounded-2xl p-6 sm:p-8 transition-all duration-300 animate-slide-up
						{tier.highlighted
							? 'glass glow-border scale-[1.02]'
							: 'glass hover:bg-white/[0.04]'}"
					style="animation-delay: {i * 0.08}s;"
				>
					{#if tier.highlighted}
						<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent-600 text-white text-[10px] font-semibold uppercase tracking-wider rounded-full">
							Most Popular
						</div>
					{/if}

					<h3 class="text-lg font-semibold text-white">{tier.name}</h3>
					<p class="mt-1 text-sm text-surface-500">{tier.description}</p>

					<div class="mt-6 mb-8">
						{#if tier.price === 0}
							<span class="text-4xl font-black text-white">Free</span>
						{:else}
							<span class="text-4xl font-black text-white">${annual ? tier.annualPrice : tier.price}</span>
							<span class="text-sm text-surface-500">/month</span>
						{/if}
					</div>

					<ul class="space-y-3 mb-8">
						{#each tier.features as feature}
							<li class="flex items-start gap-2.5 text-sm text-surface-300">
								<svg class="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path d="M4.5 12.75l6 6 9-13.5" />
								</svg>
								{feature}
							</li>
						{/each}
					</ul>

					<button
						class="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200
							{tier.highlighted
								? 'bg-white text-surface-950 hover:bg-surface-100 shadow-lg shadow-white/10'
								: 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20'}"
					>
						{tier.cta}
					</button>
				</div>
			{/each}
		</div>

		<!-- Credit packs -->
		<div class="text-center mb-10">
			<h2 class="text-2xl sm:text-3xl font-bold text-white">Pay As You Go</h2>
			<p class="mt-3 text-surface-400">Buy credit packs for on-demand generation</p>
		</div>

		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
			{#each creditPacks as pack, i}
				<button
					class="glass rounded-xl p-5 text-center hover:bg-white/[0.04] hover:-translate-y-1 transition-all duration-300 group animate-slide-up"
					style="animation-delay: {i * 0.06}s;"
				>
					<p class="text-2xl font-bold text-white group-hover:text-accent-400 transition-colors">{pack.amount}</p>
					<p class="text-xs text-surface-500 mt-1">credits</p>
					<div class="mt-4 pt-3 border-t border-white/5">
						<p class="text-lg font-semibold text-white">${pack.price}</p>
						<p class="text-[10px] text-surface-600">${(pack.price / pack.amount * 100).toFixed(1)}&cent; per credit</p>
					</div>
				</button>
			{/each}
		</div>

		<!-- Model costs reference -->
		<div class="mt-16 glass rounded-2xl p-6 sm:p-8">
			<h3 class="text-lg font-semibold text-white mb-6">Model Costs</h3>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each [
					{ name: 'Nano Banana', cost: 3, type: 'Image Edit' },
					{ name: 'Gemini Flash Edit', cost: 2, type: 'Image Edit' },
					{ name: 'Seedream 4', cost: 5, type: 'Image Gen' },
					{ name: 'Flux Pro', cost: 6, type: 'Image Gen' },
					{ name: 'MiniMax 2.0', cost: 10, type: 'Video Gen' },
					{ name: 'Veo 3 Fast', cost: 12, type: 'Video Gen' },
					{ name: 'Runway Gen-3', cost: 15, type: 'Video Gen' },
					{ name: 'Kling Avatar', cost: 15, type: 'Avatar' },
					{ name: 'Seedance Pro', cost: 10, type: 'Video Gen' },
				] as model}
					<div class="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
						<div>
							<p class="text-sm font-medium text-surface-300">{model.name}</p>
							<p class="text-[10px] text-surface-600 uppercase tracking-wider">{model.type}</p>
						</div>
						<span class="text-sm font-semibold text-white">{model.cost} <span class="text-surface-500 text-xs">cr</span></span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
