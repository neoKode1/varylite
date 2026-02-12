import { G as head, z as attr_class, y as attr, x as ensure_array_like, F as stringify } from "../../../chunks/index.js";
import { k as escape_html } from "../../../chunks/context.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let prompt = "";
    let selectedModel = "nano-banana";
    let selectedMode = "text-to-image";
    let isGenerating = false;
    let uploadedFiles = [];
    let generations = [];
    const modelGroups = {
      "text-to-image": [
        { id: "nano-banana", name: "Nano Banana", credits: 3 },
        { id: "seedream-4", name: "Seedream 4", credits: 5 },
        { id: "flux-pro", name: "Flux Pro", credits: 6 },
        { id: "gemini-flash", name: "Gemini Flash Edit", credits: 2 },
        { id: "ideogram-v3", name: "Ideogram v3", credits: 5 }
      ],
      "text-to-video": [
        { id: "minimax-2", name: "MiniMax 2.0", credits: 10 },
        { id: "veo3-fast", name: "Veo 3 Fast", credits: 12 },
        { id: "runway-gen3", name: "Runway Gen-3", credits: 15 },
        { id: "seedance-pro", name: "Seedance Pro", credits: 10 }
      ],
      "image-to-video": [
        { id: "minimax-i2v", name: "MiniMax I2V", credits: 10 },
        { id: "kling-avatar", name: "Kling Avatar", credits: 15 },
        { id: "runway-i2v", name: "Runway I2V", credits: 15 }
      ]
    };
    const availableModels = modelGroups[selectedMode];
    head("1a93izo", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Generate — vARYLite</title>`);
      });
    });
    $$renderer2.push(`<div class="min-h-[100dvh] bg-surface-950"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8"><div class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8"><div class="space-y-6"><div${attr_class(`relative aspect-[4/3] lg:aspect-[16/10] rounded-2xl overflow-hidden border transition-all duration-300 ${stringify("border-white/10 bg-surface-900/50")}`)} role="region" aria-label="Generation display">`);
    if (generations.length > 0) {
      $$renderer2.push("<!--[1-->");
      const latest = generations[0];
      $$renderer2.push(`<button class="w-full h-full">`);
      if (latest.type === "video") {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<video${attr("src", latest.url)} class="w-full h-full object-cover animate-blur-in" autoplay="" loop="" muted="" playsinline=""></video>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<img${attr("src", latest.url)}${attr("alt", latest.prompt)} class="w-full h-full object-cover animate-blur-in"/>`);
      }
      $$renderer2.push(`<!--]--></button> <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"><p class="text-sm text-white/90 line-clamp-1">${escape_html(latest.prompt)}</p> <p class="text-xs text-white/50 mt-1">${escape_html(latest.model)}</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<label class="absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer"><div class="w-16 h-16 rounded-2xl border border-dashed border-white/20 flex items-center justify-center text-surface-500"><svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M12 4.5v15m7.5-7.5h-15"></path></svg></div> <div class="text-center"><p class="text-sm font-medium text-surface-300">Drop images here or click to upload</p> <p class="text-xs text-surface-500 mt-1">Or type a prompt below to generate from text</p></div> <input type="file" accept="image/*,video/*" multiple="" class="hidden"/></label>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    if (uploadedFiles.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex flex-wrap gap-2"><!--[-->`);
      const each_array = ensure_array_like(uploadedFiles);
      for (let i = 0, $$length = each_array.length; i < $$length; i++) {
        let file = each_array[i];
        $$renderer2.push(`<div class="relative group"><div class="w-16 h-16 rounded-lg bg-surface-800 border border-white/10 overflow-hidden">`);
        if (file.type.startsWith("image/")) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<img${attr("src", URL.createObjectURL(file))}${attr("alt", file.name)} class="w-full h-full object-cover"/>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<div class="w-full h-full flex items-center justify-center text-xs text-surface-400">${escape_html(file.name.split(".").pop()?.toUpperCase())}</div>`);
        }
        $$renderer2.push(`<!--]--></div> <button class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (generations.length > 1) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div><h3 class="text-sm font-medium text-surface-400 mb-3">Recent Generations</h3> <div class="grid grid-cols-4 sm:grid-cols-6 gap-2"><!--[-->`);
      const each_array_1 = ensure_array_like(generations.slice(1, 13));
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let gen = each_array_1[$$index_1];
        $$renderer2.push(`<button class="aspect-square rounded-lg overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:scale-105"><img${attr("src", gen.url)}${attr("alt", gen.prompt)} class="w-full h-full object-cover"/></button>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="space-y-5"><div class="glass rounded-xl p-1 flex gap-1"><!--[-->`);
    const each_array_2 = ensure_array_like([
      { id: "text-to-image", label: "Text → Image" },
      { id: "text-to-video", label: "Text → Video" },
      { id: "image-to-video", label: "Image → Video" }
    ]);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let mode = each_array_2[$$index_2];
      $$renderer2.push(`<button${attr_class(`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${stringify(selectedMode === mode.id ? "bg-white/10 text-white" : "text-surface-500 hover:text-surface-300")}`)}>${escape_html(mode.label)}</button>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="glass rounded-xl p-4 space-y-3"><label for="model-select" class="text-xs font-medium text-surface-400 uppercase tracking-wider">Model</label> `);
    $$renderer2.select(
      {
        id: "model-select",
        value: selectedModel,
        class: "w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500/50"
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array_3 = ensure_array_like(availableModels);
        for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
          let model = each_array_3[$$index_3];
          $$renderer3.option({ value: model.id }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(model.name)} — ${escape_html(model.credits)} credits`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(`</div> <div class="glass rounded-xl p-4 space-y-3"><label for="prompt-input" class="text-xs font-medium text-surface-400 uppercase tracking-wider">Prompt</label> <textarea id="prompt-input" placeholder="Describe your scene in detail..."${attr("rows", 4)} class="w-full bg-surface-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500/50 resize-none">`);
    const $$body = escape_html(prompt);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea> <button class="text-xs text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1"><svg${attr_class(`w-3 h-3 transition-transform ${stringify("")}`)} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M8.25 4.5l7.5 7.5-7.5 7.5"></path></svg> Things to avoid</button> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <button${attr_class(`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${stringify("bg-white text-surface-950 hover:bg-surface-100 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/10")}`)}${attr("disabled", isGenerating, true)}>`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"></path></svg> Generate`);
    }
    $$renderer2.push(`<!--]--></button> <div class="glass rounded-xl p-4"><h4 class="text-xs font-medium text-surface-400 uppercase tracking-wider mb-3">Quick Tips</h4> <ul class="space-y-2 text-xs text-surface-500"><li class="flex gap-2"><span class="text-accent-400 flex-shrink-0">-</span> <span>Be specific: describe lighting, camera angle, mood</span></li> <li class="flex gap-2"><span class="text-accent-400 flex-shrink-0">-</span> <span>Upload reference images for character consistency</span></li> <li class="flex gap-2"><span class="text-accent-400 flex-shrink-0">-</span> <span>Use negative prompts to avoid unwanted elements</span></li></ul></div></div></div></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
