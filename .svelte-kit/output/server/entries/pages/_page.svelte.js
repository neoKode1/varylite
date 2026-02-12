import { G as head, x as ensure_array_like, z as attr_class, J as attr_style, F as stringify } from "../../chunks/index.js";
import { k as escape_html } from "../../chunks/context.js";
function html(value) {
  var html2 = String(value ?? "");
  var open = "<!---->";
  return open + html2 + "<!---->";
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let currentModel = 0;
    const models = [
      { name: "Nano Banana", type: "Image Edit", icon: "🖼️" },
      { name: "Veo 3 Fast", type: "Text → Video", icon: "🎬" },
      { name: "MiniMax 2.0", type: "Video Gen", icon: "🎥" },
      { name: "Seedream 4", type: "Image Gen", icon: "🌱" },
      { name: "Runway Gen-3", type: "Video Gen", icon: "🛤️" },
      { name: "Kling Avatar", type: "Avatar", icon: "👤" }
    ];
    const features = [
      {
        title: "Text to Image",
        description: "Describe your vision and watch it come to life with cutting-edge diffusion models.",
        icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"/></svg>`
      },
      {
        title: "Text to Video",
        description: "Generate cinematic videos from simple text prompts with models like Veo 3, MiniMax, and Runway.",
        icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-2.625 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m1.125-2.625c0-.621-.504-1.125-1.125-1.125M4.875 15.75h1.5"/></svg>`
      },
      {
        title: "Image to Video",
        description: "Animate any still image into fluid, natural motion video with a single click.",
        icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"/></svg>`
      },
      {
        title: "Character Variations",
        description: "Generate consistent character views from multiple angles and in different styles.",
        icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>`
      },
      {
        title: "Lip Sync",
        description: "Sync audio to any face in your videos for realistic talking head content.",
        icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"/></svg>`
      },
      {
        title: "Browser Storage",
        description: "Your creations stay in your browser. No account needed, no data on our servers.",
        icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>`
      }
    ];
    const stats = [
      { value: "70+", label: "AI Models" },
      { value: "Free", label: "To Start" },
      { value: "0", label: "Sign-ups Required" },
      { value: "24/7", label: "Available" }
    ];
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>vARYLite — Free AI Scene Generator</title>`);
      });
    });
    $$renderer2.push(`<section class="relative min-h-[100dvh] flex items-center justify-center overflow-hidden"><div class="absolute inset-0"><div class="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950 to-surface-900"></div> <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-accent-600/10 blur-[120px] animate-pulse-glow"></div> <div class="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[100px] animate-pulse-glow" style="animation-delay: 1.5s;"></div> <div class="absolute inset-0 opacity-[0.03]" style="background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 64px 64px;"></div></div> <div class="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 text-center"><div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-surface-300 mb-8 animate-fade-in"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> AI-Powered Scene Generation</div> <h1 class="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] animate-slide-up"><span class="block text-white">IMAGINE</span> <span class="block gradient-text mt-1">YOUR WORLD</span></h1> <p class="mt-6 text-lg sm:text-xl text-surface-400 max-w-2xl mx-auto leading-relaxed animate-slide-up text-balance" style="animation-delay: 0.1s;">The free AI app made for creation by creators. Generate stunning images and videos
			with 70+ models — no sign-up required.</p> <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style="animation-delay: 0.2s;"><a href="/generate" class="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-surface-950 font-bold text-lg rounded-xl hover:bg-surface-100 transition-all duration-300 hover:scale-105 shadow-2xl shadow-white/10"><span>Start Creating</span> <svg class="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"></path></svg></a> <a href="/gallery" class="inline-flex items-center gap-2 px-8 py-4 text-surface-300 hover:text-white font-medium text-lg rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-300">View Gallery</a></div> <div class="mt-16 animate-slide-up" style="animation-delay: 0.35s;"><p class="text-xs text-surface-500 uppercase tracking-widest mb-4">Powered by</p> <div class="flex flex-wrap justify-center gap-3"><!--[-->`);
    const each_array = ensure_array_like(models);
    for (let i = 0, $$length = each_array.length; i < $$length; i++) {
      let model = each_array[i];
      $$renderer2.push(`<button${attr_class(`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-500 ${stringify(i === currentModel ? "glass glow-border text-white scale-105" : "text-surface-500 hover:text-surface-300 bg-white/[0.02] hover:bg-white/[0.04]")}`)}><span class="mr-1.5">${escape_html(model.icon)}</span> ${escape_html(model.name)}</button>`);
    }
    $$renderer2.push(`<!--]--></div></div></div> <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float"><svg class="w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"></path></svg></div></section> <section class="border-y border-white/5 bg-surface-950/80"><div class="mx-auto max-w-6xl px-4 sm:px-6 py-12"><div class="grid grid-cols-2 md:grid-cols-4 gap-8"><!--[-->`);
    const each_array_1 = ensure_array_like(stats);
    for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
      let stat = each_array_1[i];
      $$renderer2.push(`<div class="text-center animate-slide-up"${attr_style(`animation-delay: ${stringify(i * 0.08)}s;`)}><p class="text-3xl sm:text-4xl font-black text-white">${escape_html(stat.value)}</p> <p class="mt-1 text-sm text-surface-500">${escape_html(stat.label)}</p></div>`);
    }
    $$renderer2.push(`<!--]--></div></div></section> <section class="py-24 sm:py-32"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div class="text-center mb-16"><h2 class="text-3xl sm:text-4xl font-bold text-white">Everything You Need to Create</h2> <p class="mt-4 text-lg text-surface-400 max-w-2xl mx-auto text-balance">From text prompts to fully animated scenes, vARYLite gives you access
				to the most powerful AI generation tools — for free.</p></div> <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"><!--[-->`);
    const each_array_2 = ensure_array_like(features);
    for (let i = 0, $$length = each_array_2.length; i < $$length; i++) {
      let feature = each_array_2[i];
      $$renderer2.push(`<div class="group relative p-6 rounded-2xl glass hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-1 animate-slide-up"${attr_style(`animation-delay: ${stringify(i * 0.06)}s;`)}><div class="w-12 h-12 rounded-xl bg-accent-600/10 border border-accent-500/20 flex items-center justify-center text-accent-400 mb-4 group-hover:scale-110 transition-transform">${html(feature.icon)}</div> <h3 class="text-lg font-semibold text-white mb-2">${escape_html(feature.title)}</h3> <p class="text-sm text-surface-400 leading-relaxed">${escape_html(feature.description)}</p></div>`);
    }
    $$renderer2.push(`<!--]--></div></div></section> <section class="py-24 sm:py-32 border-t border-white/5"><div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8"><div class="text-center mb-16"><h2 class="text-3xl sm:text-4xl font-bold text-white">How It Works</h2> <p class="mt-4 text-lg text-surface-400">Three steps to your first creation</p></div> <div class="grid grid-cols-1 md:grid-cols-3 gap-8"><!--[-->`);
    const each_array_3 = ensure_array_like([
      {
        step: "01",
        title: "Upload or Describe",
        desc: "Drop in reference images or write a detailed text prompt describing your scene."
      },
      {
        step: "02",
        title: "Choose Your Model",
        desc: "Pick from 70+ AI models optimized for images, videos, avatars, and more."
      },
      {
        step: "03",
        title: "Generate & Download",
        desc: "Hit generate and download your creation. Everything is saved in your browser."
      }
    ]);
    for (let i = 0, $$length = each_array_3.length; i < $$length; i++) {
      let item = each_array_3[i];
      $$renderer2.push(`<div class="text-center animate-slide-up"${attr_style(`animation-delay: ${stringify(i * 0.1)}s;`)}><div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-900 border border-white/10 mb-6"><span class="text-2xl font-black gradient-text">${escape_html(item.step)}</span></div> <h3 class="text-lg font-semibold text-white mb-2">${escape_html(item.title)}</h3> <p class="text-sm text-surface-400 leading-relaxed">${escape_html(item.desc)}</p></div>`);
    }
    $$renderer2.push(`<!--]--></div></div></section> <section class="py-24 sm:py-32 border-t border-white/5 bg-surface-900/30"><div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"><div class="text-center mb-16"><h2 class="text-3xl sm:text-4xl font-bold text-white">Powered by the Best Models</h2> <p class="mt-4 text-lg text-surface-400">Access premium AI from top providers, all in one place.</p></div> <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"><!--[-->`);
    const each_array_4 = ensure_array_like([
      { name: "Flux", category: "Image" },
      { name: "Veo 3", category: "Video" },
      { name: "MiniMax", category: "Video" },
      { name: "Runway", category: "Video" },
      { name: "Kling", category: "Avatar" },
      { name: "Gemini", category: "Edit" },
      { name: "DALL-E", category: "Image" },
      { name: "Seedream", category: "Image" },
      { name: "Pika", category: "Video" },
      { name: "Replicate", category: "Multi" },
      { name: "ElevenLabs", category: "Audio" },
      { name: "Ideogram", category: "Image" }
    ]);
    for (let i = 0, $$length = each_array_4.length; i < $$length; i++) {
      let provider = each_array_4[i];
      $$renderer2.push(`<div class="group flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 animate-slide-up"${attr_style(`animation-delay: ${stringify(i * 0.04)}s;`)}><span class="text-sm font-semibold text-surface-300 group-hover:text-white transition-colors">${escape_html(provider.name)}</span> <span class="text-[10px] text-surface-600 uppercase tracking-wider">${escape_html(provider.category)}</span></div>`);
    }
    $$renderer2.push(`<!--]--></div></div></section> <section class="py-24 sm:py-32 border-t border-white/5"><div class="mx-auto max-w-4xl px-4 sm:px-6 text-center"><h2 class="text-3xl sm:text-5xl font-black text-white leading-tight">Ready to Create<br/> <span class="gradient-text">Something Amazing?</span></h2> <p class="mt-6 text-lg text-surface-400 max-w-xl mx-auto text-balance">No sign-up. No credit card. Just open and start creating
			with the most powerful AI tools available.</p> <div class="mt-10"><a href="/generate" class="group inline-flex items-center gap-3 px-10 py-5 bg-white text-surface-950 font-bold text-xl rounded-2xl hover:bg-surface-100 transition-all duration-300 hover:scale-105 shadow-2xl shadow-white/10"><span>Start vARYLite</span> <svg class="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"></path></svg></a></div></div></section>`);
  });
}
export {
  _page as default
};
