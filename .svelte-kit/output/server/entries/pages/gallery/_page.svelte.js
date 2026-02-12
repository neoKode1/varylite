import { G as head, x as ensure_array_like, z as attr_class, J as attr_style, y as attr, F as stringify } from "../../../chunks/index.js";
import { k as escape_html } from "../../../chunks/context.js";
function _page($$renderer) {
  let selectedFilter = "all";
  const filters = ["all", "images", "videos", "characters"];
  const galleryItems = [
    {
      id: "1",
      url: "https://picsum.photos/seed/vary1/600/400",
      type: "image",
      prompt: "Cyberpunk cityscape at dusk",
      model: "Flux Pro",
      timestamp: Date.now() - 36e5
    },
    {
      id: "2",
      url: "https://picsum.photos/seed/vary2/600/600",
      type: "image",
      prompt: "Ethereal forest with bioluminescent trees",
      model: "Seedream 4",
      timestamp: Date.now() - 72e5
    },
    {
      id: "3",
      url: "https://picsum.photos/seed/vary3/400/600",
      type: "image",
      prompt: "Astronaut floating in a nebula",
      model: "Nano Banana",
      timestamp: Date.now() - 108e5
    },
    {
      id: "4",
      url: "https://picsum.photos/seed/vary4/600/400",
      type: "image",
      prompt: "Japanese garden in autumn",
      model: "Gemini Flash",
      timestamp: Date.now() - 144e5
    },
    {
      id: "5",
      url: "https://picsum.photos/seed/vary5/600/600",
      type: "image",
      prompt: "Futuristic spaceship interior",
      model: "Flux Pro",
      timestamp: Date.now() - 18e6
    },
    {
      id: "6",
      url: "https://picsum.photos/seed/vary6/400/600",
      type: "image",
      prompt: "Dragon perched on a crystal mountain",
      model: "Ideogram v3",
      timestamp: Date.now() - 216e5
    },
    {
      id: "7",
      url: "https://picsum.photos/seed/vary7/600/400",
      type: "image",
      prompt: "Underwater temple ruins",
      model: "Seedream 4",
      timestamp: Date.now() - 252e5
    },
    {
      id: "8",
      url: "https://picsum.photos/seed/vary8/600/600",
      type: "image",
      prompt: "Steampunk clockwork mechanism",
      model: "Nano Banana",
      timestamp: Date.now() - 288e5
    },
    {
      id: "9",
      url: "https://picsum.photos/seed/vary9/600/400",
      type: "image",
      prompt: "Northern lights over frozen lake",
      model: "Flux Pro",
      timestamp: Date.now() - 324e5
    }
  ];
  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const hours = Math.floor(diff / 36e5);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
  head("16h6p05", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>Gallery — vARYLite</title>`);
    });
  });
  $$renderer.push(`<div class="min-h-[100dvh] bg-surface-950"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12"><div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"><div><h1 class="text-3xl sm:text-4xl font-bold text-white">Gallery</h1> <p class="mt-2 text-surface-400">Browse community creations and get inspired</p></div> <div class="flex gap-1 p-1 glass rounded-xl"><!--[-->`);
  const each_array = ensure_array_like(filters);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let filter = each_array[$$index];
    $$renderer.push(`<button${attr_class(`px-4 py-2 text-xs font-medium rounded-lg capitalize transition-all ${stringify(selectedFilter === filter ? "bg-white/10 text-white" : "text-surface-500 hover:text-surface-300")}`)}>${escape_html(filter)}</button>`);
  }
  $$renderer.push(`<!--]--></div></div> <div class="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4"><!--[-->`);
  const each_array_1 = ensure_array_like(galleryItems);
  for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
    let item = each_array_1[i];
    $$renderer.push(`<div class="break-inside-avoid group animate-slide-up"${attr_style(`animation-delay: ${stringify(i * 0.05)}s;`)}><button class="relative w-full rounded-xl overflow-hidden border border-white/5 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 block"><img${attr("src", item.url)}${attr("alt", item.prompt)} class="w-full h-auto block" loading="lazy"/> <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"><div class="absolute bottom-0 left-0 right-0 p-4"><p class="text-sm text-white line-clamp-2">${escape_html(item.prompt)}</p> <div class="flex items-center justify-between mt-2"><span class="text-[10px] text-white/50 uppercase tracking-wider">${escape_html(item.model)}</span> <span class="text-[10px] text-white/40">${escape_html(timeAgo(item.timestamp))}</span></div></div></div></button></div>`);
  }
  $$renderer.push(`<!--]--></div> `);
  if (galleryItems.length === 0) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<div class="text-center py-24"><div class="w-20 h-20 mx-auto rounded-2xl border border-dashed border-white/20 flex items-center justify-center mb-6"><svg class="w-10 h-10 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"></path></svg></div> <h3 class="text-lg font-medium text-surface-300">No creations yet</h3> <p class="mt-2 text-sm text-surface-500">Generate your first scene to see it here</p> <a href="/generate" class="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-white text-surface-950 font-semibold text-sm rounded-xl hover:bg-surface-100 transition-colors">Start Creating</a></div>`);
  } else {
    $$renderer.push("<!--[!-->");
  }
  $$renderer.push(`<!--]--></div></div> `);
  {
    $$renderer.push("<!--[!-->");
  }
  $$renderer.push(`<!--]-->`);
}
export {
  _page as default
};
