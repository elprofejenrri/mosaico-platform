import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";

export default function Blog() {
  const { t, lang } = useApp();
  const [posts, setPosts] = useState([]);
  useEffect(() => { api.get("/blog").then((r) => setPosts(r.data)).catch(() => {}); }, []);

  return (
    <div data-testid="blog-page" className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
      <p className="text-xs uppercase tracking-[0.3em] text-[#E8704C] mb-6">{t.blog.eyebrow}</p>
      <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight max-w-3xl">{t.blog.title}</h1>
      <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-8">
        {posts.map((p, i) => (
          <Link
            key={p.slug}
            to={`/blog/${p.slug}`}
            data-testid={`blog-card-${i}`}
            className={`group block bg-white border border-[#EFE4D0] hover:border-[#E8704C] rounded-2xl overflow-hidden transition-colors ${i === 0 ? "md:col-span-12" : "md:col-span-6"}`}
          >
            <div className={`overflow-hidden ${i === 0 ? "h-[420px]" : "h-[260px]"}`}>
              <img src={p.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-8">
              <h2 className="font-display text-2xl md:text-3xl tracking-tight">{lang === "en" ? p.title_en : p.title_es}</h2>
              <p className="mt-3 text-[#5C6680]">{lang === "en" ? p.excerpt_en : p.excerpt_es}</p>
              <span className="mt-6 inline-block text-xs uppercase tracking-[0.2em] text-[#E8704C]">{t.blog.readMore} →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
