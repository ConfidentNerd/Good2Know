import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import useHttp from "../../customHooks/useHttp";
import { sanitizeContentHtml } from "../../utils/sanitizeContentHtml";
import "./style.css";

type ContentResponse = {
    content: string;
    label: string;
    isFullWidth: boolean;
};

const highlightHtml = (html: string, search: string) => {
    if (!search.trim()) return html;

    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");

    const doc = new DOMParser().parseFromString(html, "text/html");

    const walker = document.createTreeWalker(
        doc.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (!node.textContent?.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }

                const parent = node.parentElement?.tagName.toLowerCase();

                if (
                    parent === "script" ||
                    parent === "style" ||
                    parent === "mark"
                ) {
                    return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
            },
        }
    );

    const textNodes: Text[] = [];

    while (walker.nextNode()) {
        textNodes.push(walker.currentNode as Text);
    }

    for (const node of textNodes) {
        const text = node.textContent ?? "";

        // regex.lastIndex = 0;

        if (!regex.test(text)) {
            continue;
        }

        regex.lastIndex = 0;

        const fragment = doc.createDocumentFragment();
        let lastIndex = 0;

        text.replace(regex, (match, offset) => {
            const before = text.slice(lastIndex, offset);

            if (before) {
                fragment.appendChild(doc.createTextNode(before));
            }

            const mark = doc.createElement("mark");
            mark.className = "search-highlight";
            mark.textContent = match;

            fragment.appendChild(mark);

            lastIndex = offset + match.length;

            return match;
        });

        const after = text.slice(lastIndex);

        if (after) {
            fragment.appendChild(doc.createTextNode(after));
        }

        node.parentNode?.replaceChild(fragment, node);
    }

    return doc.body.innerHTML;
};

export default function ContentPage() {
    const { articleId } = useParams();
    const [searchParams] = useSearchParams();
    const { makeRequest, isLoading } = useHttp();

    const searchQuery = searchParams.get("q")?.trim() ?? "";

    const [content, setContent] = useState<ContentResponse | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!articleId) return;

        const fetchContent = async () => {
            try {
                setError(false);

                const response = await makeRequest({
                    url: `/public/content/${articleId}`,
                    method: "GET",
                });

                const data = await response.json();
                setContent(data);
            } catch (err) {
                console.error("Failed to fetch content:", err);
                setError(true);
                setContent(null);
            }
        };

        fetchContent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articleId]);

    const htmlToRender = useMemo(() => {
        if (!content?.content) return "";

        const cleanContent = sanitizeContentHtml(content.content);

        if (!searchQuery) {
            return cleanContent;
        }

        return highlightHtml(cleanContent, searchQuery);
    }, [content, searchQuery]);

    useEffect(() => {
        if (!searchQuery || !htmlToRender) return;

        requestAnimationFrame(() => {
            const firstMatch = document.querySelector(".search-highlight");

            firstMatch?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        });
    }, [searchQuery, htmlToRender]);

    if (isLoading) {
        return (
            <main dir="rtl" className="min-h-screen bg-slate-50 px-3 py-6 sm:px-4 sm:py-8">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-14">
                        <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />

                        <h2 className="text-2xl font-black text-slate-800">
                            טוען תוכן...
                        </h2>

                        <p className="mt-3 text-slate-500">
                            אנא המתן בזמן שאנחנו טוענים את הדף.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (error || !content) {
        return (
            <main dir="rtl" className="min-h-screen bg-slate-50 px-3 py-6 sm:px-4 sm:py-8">
                <div className="mx-auto max-w-4xl">
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-14">
                        <h2 className="text-2xl font-black text-slate-800">
                            אין כאן עדיין תוכן
                        </h2>

                        <p className="mt-3 text-slate-500">
                            הדף הזה ריק או שלא ניתן היה לטעון אותו כראוי.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const articleBaseClasses = `
              content-html prose prose-slate max-w-none
              prose-headings:font-black
              prose-h1:text-3xl
              prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-2
              prose-p:leading-8
              prose-a:font-bold prose-a:text-blue-700
              prose-strong:text-slate-950
              prose-ul:my-4
              prose-li:my-1
              prose-img:rounded-2xl prose-img:shadow-md

              [&_.search-highlight]:rounded
              [&_.search-highlight]:bg-yellow-300
              [&_.search-highlight]:px-1
              [&_.search-highlight]:font-bold
              [&_.search-highlight]:text-slate-950
    `;

    const articleSpacingClasses = content.isFullWidth ? "" : "p-4 sm:p-6 md:p-8";

    return (
        <main
            className={`min-h-screen bg-slate-50 text-slate-900 ${content.isFullWidth ? "" : "px-3 py-6 sm:px-4 sm:py-8"
                }`}
        >
            <div className={content.isFullWidth ? "" : "mx-auto max-w-7xl"}>
                <section className={content.isFullWidth ? "bg-white" : "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"}>
                    {!content.isFullWidth && (
                        <header
                            dir="auto"
                            className="border-b border-slate-200 bg-linear-to-l from-[#10284f] to-[#16477f] px-4 py-5 text-white sm:px-6 sm:py-7"
                        >
                            <h1 className="text-2xl font-black leading-tight sm:text-3xl">
                                {content.label}
                            </h1>

                            {searchQuery && (
                                <p className="mt-3 text-sm text-slate-200">
                                    מציג התאמות עבור:{" "}
                                    <span className="rounded-full bg-white/15 px-2 py-1 font-bold text-white">
                                        {searchQuery}
                                    </span>
                                </p>
                            )}
                        </header>
                    )}

                    <article
                        dir="auto"
                        className={`${articleBaseClasses} ${articleSpacingClasses}`}
                        dangerouslySetInnerHTML={{ __html: htmlToRender }}
                    />
                </section>
            </div>
        </main>
    );
}