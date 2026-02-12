<script>
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>vARYLite — Free AI Scene Generator</title>
</svelte:head>

<div class="min-h-screen flex flex-col bg-surface-950 text-surface-50 font-sans antialiased">
	<Nav />
	<main class="flex-1 pt-16">
		{@render children()}
	</main>
	<Footer />
</div>
