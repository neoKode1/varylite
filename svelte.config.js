import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		}),
		alias: {
			'$lib': './src/lib',
			'$components': './src/lib/components'
		}
	}
};

export default config;
