import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { ArrowLeft } from "lucide-react";

export default function BlogPost() {
  const { slug } = useParams();
  const { lang } = useApp();
  const [post, setPost] = useState(null);
  useEffect(() => { api.get(`/blog/${slug}`).then((r) => setPost(r.data)).catch(() => {}); }, [slug]);

  if (!post) return <div className="max-w-3xl mx-auto px-6 py-20">Loading…</div>;
  const title = lang === "en" ? post.title_en : post.title_es;
  const body = lang === "en" ? post.body_en : post.body_es;

  return (
    <article data-testid="blog-post" className="max-w-3xl mx-auto px-6 lg:px-10 py-20">
      <Link to="/blog" className="text-xs uppercase tracking-[0.2em] text-[#5C6680] hover:text-[#E8704C] flex items-center gap-2">
        <ArrowLeft size={12} /> {lang === "en" ? "All posts" : "Todas las entradas"}
      </Link>
      <h1 className="mt-8 font-display text-4xl sm:text-5xl tracking-tight leading-tight">{title}</h1>
      <img src={post.cover_image} alt="" className="mt-10 w-full max-h-[60vh] object-cover" />
      <div className="mt-10 prose prose-lg max-w-none text-[#1F3B6E]/85 leading-relaxed whitespace-pre-line">
        {body}
      </div>
    </article>
  );
}
