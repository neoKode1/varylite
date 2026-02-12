import { x as ensure_array_like, y as attr, z as attr_class, F as stringify, G as head } from "../../chunks/index.js";
import { p as page } from "../../chunks/index2.js";
import { k as escape_html } from "../../chunks/context.js";
function Nav($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const links = [
      { href: "/", label: "Home" },
      { href: "/generate", label: "Generate" },
      { href: "/gallery", label: "Gallery" },
      { href: "/community", label: "Community" },
      { href: "/pricing", label: "Pricing" }
    ];
    function isActive(href) {
      if (href === "/") return page.url.pathname === "/";
      return page.url.pathname.startsWith(href);
    }
    $$renderer2.push(`<nav class="fixed top-0 left-0 right-0 z-50 glass-strong"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div class="flex h-16 items-center justify-between"><a href="/" class="flex items-center gap-2 group"><span class="text-xl font-bold tracking-tight"><span class="text-white/70 text-lg">v</span><span class="text-white font-black">ARY</span><span class="gradient-text font-extrabold">Lite</span></span></a> <div class="hidden md:flex items-center gap-1"><!--[-->`);
    const each_array = ensure_array_like(links);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let { href, label } = each_array[$$index];
      $$renderer2.push(`<a${attr("href", href)}${attr_class(`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${stringify(isActive(href) ? "text-white bg-white/10" : "text-surface-400 hover:text-white hover:bg-white/5")}`)}>${escape_html(label)} `);
      if (isActive(href)) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-accent-500 rounded-full"></span>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></a>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="hidden md:flex items-center gap-3"><a href="/generate" class="px-5 py-2 text-sm font-semibold text-white bg-accent-600 hover:bg-accent-500 rounded-lg transition-colors">Start Creating</a></div> <button class="md:hidden p-2 text-surface-400 hover:text-white transition-colors" aria-label="Toggle menu"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<path d="M4 6h16M4 12h16M4 18h16"></path>`);
    }
    $$renderer2.push(`<!--]--></svg></button></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></nav>`);
  });
}
function Footer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<footer class="border-t border-white/5 bg-surface-950"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12"><div class="grid grid-cols-1 md:grid-cols-4 gap-8"><div class="md:col-span-2"><span class="text-xl font-bold tracking-tight"><span class="text-white/70 text-lg">v</span><span class="text-white font-black">ARY</span><span class="gradient-text font-extrabold">Lite</span></span> <p class="mt-3 text-sm text-surface-400 max-w-sm leading-relaxed">Free AI scene generator made for creation by creators.
					Generate stunning images and videos with 70+ AI models.</p></div> <div><h3 class="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-4">Product</h3> <ul class="space-y-2.5 text-sm"><li><a href="/generate" class="text-surface-400 hover:text-white transition-colors">Generate</a></li> <li><a href="/gallery" class="text-surface-400 hover:text-white transition-colors">Gallery</a></li> <li><a href="/community" class="text-surface-400 hover:text-white transition-colors">Community</a></li> <li><a href="/pricing" class="text-surface-400 hover:text-white transition-colors">Pricing</a></li></ul></div> <div><h3 class="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-4">Resources</h3> <ul class="space-y-2.5 text-sm"><li><span class="text-surface-500">Documentation</span></li> <li><span class="text-surface-500">API Reference</span></li> <li><span class="text-surface-500">Changelog</span></li></ul></div></div> <div class="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4"><p class="text-xs text-surface-500">© ${escape_html((/* @__PURE__ */ new Date()).getFullYear())} vARYLite. All rights reserved.</p> <p class="text-xs text-surface-600">Powered by AI</p></div></div></footer>`);
  });
}
function _layout($$renderer, $$props) {
  let { children } = $$props;
  head("12qhfyh", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>vARYLite — Free AI Scene Generator</title>`);
    });
  });
  $$renderer.push(`<div class="min-h-screen flex flex-col bg-surface-950 text-white font-sans">`);
  Nav($$renderer);
  $$renderer.push(`<!----> <main class="flex-1 pt-16">`);
  children($$renderer);
  $$renderer.push(`<!----></main> `);
  Footer($$renderer);
  $$renderer.push(`<!----></div>`);
}
export {
  _layout as default
};
