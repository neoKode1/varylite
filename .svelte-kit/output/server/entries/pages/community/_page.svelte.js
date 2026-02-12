import { G as head, z as attr_class, y as attr, x as ensure_array_like, J as attr_style, F as stringify } from "../../../chunks/index.js";
import { k as escape_html } from "../../../chunks/context.js";
function _page($$renderer) {
  let newPostText = "";
  const posts = [
    {
      id: "1",
      author: "CreatorX",
      avatar: "CX",
      content: "Just generated this incredible cyberpunk cityscape with Veo 3! The lighting is unreal.",
      image: "https://picsum.photos/seed/post1/800/500",
      likes: 24,
      comments: 8,
      reposts: 3,
      timeAgo: "2h ago"
    },
    {
      id: "2",
      author: "ArtistZero",
      avatar: "AZ",
      content: "Character variations are getting so good. Same character from 6 different angles, all consistent!",
      image: "https://picsum.photos/seed/post2/800/600",
      likes: 47,
      comments: 12,
      reposts: 9,
      timeAgo: "5h ago"
    },
    {
      id: "3",
      author: "PixelDreamer",
      avatar: "PD",
      content: "Experimenting with Seedream 4 for abstract landscapes. The detail in the textures is insane.",
      image: "https://picsum.photos/seed/post3/600/800",
      likes: 31,
      comments: 5,
      reposts: 6,
      timeAgo: "8h ago"
    }
  ];
  head("131htjm", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>Community — vARYLite</title>`);
    });
  });
  $$renderer.push(`<div class="min-h-[100dvh] bg-surface-950"><div class="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12"><div class="mb-8"><h1 class="text-3xl sm:text-4xl font-bold text-white">Community</h1> <p class="mt-2 text-surface-400">Share your creations and get inspired by others</p></div> <div class="flex gap-1 p-1 glass rounded-xl mb-8 w-fit"><button${attr_class(`px-5 py-2 text-sm font-medium rounded-lg transition-all ${stringify(
    "bg-white/10 text-white"
  )}`)}>Feed</button> <button${attr_class(`px-5 py-2 text-sm font-medium rounded-lg transition-all ${stringify("text-surface-500 hover:text-surface-300")}`)}>Collaborators</button></div> `);
  {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<div class="glass rounded-2xl p-4 mb-6"><div class="flex gap-3"><div class="w-10 h-10 rounded-full bg-accent-600/20 border border-accent-500/30 flex items-center justify-center text-sm font-bold text-accent-400 flex-shrink-0">U</div> <div class="flex-1"><textarea placeholder="Share your latest creation..."${attr("rows", 2)} class="w-full bg-transparent border-none text-sm text-white placeholder:text-surface-600 focus:outline-none resize-none">`);
    const $$body = escape_html(newPostText);
    if ($$body) {
      $$renderer.push(`${$$body}`);
    }
    $$renderer.push(`</textarea> <div class="flex items-center justify-between mt-2 pt-2 border-t border-white/5"><button class="p-2 text-surface-500 hover:text-surface-300 rounded-lg hover:bg-white/5 transition-colors" aria-label="Upload image"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"></path></svg></button> <button class="px-4 py-1.5 bg-white text-surface-950 text-xs font-semibold rounded-lg hover:bg-surface-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"${attr("disabled", !newPostText.trim(), true)}>Post</button></div></div></div></div> <div class="space-y-4"><!--[-->`);
    const each_array = ensure_array_like(posts);
    for (let i = 0, $$length = each_array.length; i < $$length; i++) {
      let post = each_array[i];
      $$renderer.push(`<article class="glass rounded-2xl overflow-hidden animate-slide-up"${attr_style(`animation-delay: ${stringify(i * 0.08)}s;`)}><div class="p-4 flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-surface-800 border border-white/10 flex items-center justify-center text-sm font-bold text-surface-300">${escape_html(post.avatar)}</div> <div><p class="text-sm font-semibold text-white">${escape_html(post.author)}</p> <p class="text-xs text-surface-500">${escape_html(post.timeAgo)}</p></div></div> <div class="px-4 pb-3"><p class="text-sm text-surface-300 leading-relaxed">${escape_html(post.content)}</p></div> `);
      if (post.image) {
        $$renderer.push("<!--[-->");
        $$renderer.push(`<div class="mx-4 mb-4 rounded-xl overflow-hidden border border-white/5"><img${attr("src", post.image)}${attr("alt", post.content)} class="w-full h-auto" loading="lazy"/></div>`);
      } else {
        $$renderer.push("<!--[!-->");
      }
      $$renderer.push(`<!--]--> <div class="px-4 pb-4 flex items-center gap-6"><button class="flex items-center gap-1.5 text-xs text-surface-500 hover:text-red-400 transition-colors"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"></path></svg> ${escape_html(post.likes)}</button> <button class="flex items-center gap-1.5 text-xs text-surface-500 hover:text-blue-400 transition-colors"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"></path></svg> ${escape_html(post.comments)}</button> <button class="flex items-center gap-1.5 text-xs text-surface-500 hover:text-green-400 transition-colors"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"></path></svg> ${escape_html(post.reposts)}</button></div></article>`);
    }
    $$renderer.push(`<!--]--></div>`);
  }
  $$renderer.push(`<!--]--></div></div>`);
}
export {
  _page as default
};
