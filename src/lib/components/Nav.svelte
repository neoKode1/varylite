<script lang="ts">
	import { page } from '$app/state';

	let mobileOpen = $state(false);

	const links = [
		{ href: '/',          label: 'Home' },
		{ href: '/generate',  label: 'Generate' },
		{ href: '/gallery',   label: 'Gallery' },
		{ href: '/community', label: 'Community' },
		{ href: '/pricing',   label: 'Pricing' },
	] as const;

	function isActive(href: string) {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}
</script>

<nav class="fixed top-0 left-0 right-0 z-50 glass-strong">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo -->
			<a href="/" class="flex items-center gap-2 group">
				<span class="text-xl font-bold tracking-tight">
					<span class="text-surface-400 text-lg font-medium">v</span><span class="text-white font-black">ARY</span><span class="gradient-text font-extrabold">Lite</span>
				</span>
			</a>

			<!-- Desktop links -->
			<div class="hidden md:flex items-center gap-0.5">
				{#each links as { href, label }}
					<a
						{href}
						class="relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300
							{isActive(href)
								? 'text-white bg-white/10'
								: 'text-surface-400 hover:text-white hover:bg-white/[0.04]'}"
					>
						{label}
						{#if isActive(href)}
							<span class="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-gradient-to-r from-accent-500 to-cyan-400 rounded-full"></span>
						{/if}
					</a>
				{/each}
			</div>

			<!-- CTA -->
			<div class="hidden md:flex items-center gap-3">
				<a
					href="/generate"
					class="group relative px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-accent-600/20"
				>
					Start Creating
					<div class="absolute inset-0 rounded-xl shimmer-bg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
				</a>
			</div>

			<!-- Mobile hamburger -->
			<button
				class="md:hidden p-2 text-surface-400 hover:text-white transition-colors duration-300"
				onclick={() => mobileOpen = !mobileOpen}
				aria-label="Toggle menu"
			>
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					{#if mobileOpen}
						<path d="M6 18L18 6M6 6l12 12" />
					{:else}
						<path d="M4 6h16M4 12h16M4 18h16" />
					{/if}
				</svg>
			</button>
		</div>
	</div>

	<!-- Mobile menu -->
	{#if mobileOpen}
		<div class="md:hidden border-t border-white/[0.04] bg-surface-950/98 backdrop-blur-2xl animate-slide-down">
			<div class="px-4 py-5 space-y-1">
				{#each links as { href, label }}
					<a
						{href}
						onclick={() => mobileOpen = false}
						class="block px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300
							{isActive(href) ? 'text-white bg-white/10' : 'text-surface-400 hover:text-white hover:bg-white/[0.04]'}"
					>
						{label}
					</a>
				{/each}
				<a
					href="/generate"
					onclick={() => mobileOpen = false}
					class="block mt-4 px-4 py-3.5 text-center text-sm font-semibold text-white bg-gradient-to-r from-accent-600 to-accent-500 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-accent-600/20"
				>
					Start Creating
				</a>
			</div>
		</div>
	{/if}
</nav>
