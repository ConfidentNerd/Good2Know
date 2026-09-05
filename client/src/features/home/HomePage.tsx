import { useEffect, useMemo, useState } from "react";
import useHttp from "../../customHooks/useHttp";
import { sanitizeContentHtml } from "../../utils/sanitizeContentHtml";
import "../content/style.css";

type HomeContentResponse = {
  content: string;
  label: string;
  isFullWidth: boolean;
};

const HomePage = () => {
  const { makeRequest, isLoading } = useHttp();
  const [content, setContent] = useState<HomeContentResponse | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  useEffect(() => {
    const fetchHomepage = async () => {
      try {
        const response = await makeRequest({
          url: "/public/homepage",
          method: "GET",
        });

        if (response.status === 404) {
          setNotConfigured(true);
          setContent(null);
          return;
        }

        const data = (await response.json()) as HomeContentResponse;
        setContent(data);
        setNotConfigured(false);
      } catch (error) {
        console.error("Failed to fetch homepage:", error);
        setNotConfigured(true);
        setContent(null);
      }
    };

    fetchHomepage();
  }, []);

  const htmlToRender = useMemo(() => {
    if (!content?.content) return "";
    return sanitizeContentHtml(content.content);
  }, [content]);

  if (isLoading) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 px-3 py-6 sm:px-4 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-14">
            <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
            <h2 className="text-2xl font-black text-slate-800">טוען את דף הבית...</h2>
          </div>
        </div>
      </main>
    );
  }

  if (notConfigured || !content) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 px-3 py-6 sm:px-4 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-14">
            <h2 className="text-3xl font-extrabold text-slate-800 sm:text-4xl">טרם נבחר דף בית</h2>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen bg-slate-50 text-slate-900 ${content.isFullWidth ? "" : "px-3 py-6 sm:px-4 sm:py-8"}`}>
      <div className={content.isFullWidth ? "" : "mx-auto max-w-7xl"}>
        <section className={content.isFullWidth ? "bg-white" : "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"}>
          {!content.isFullWidth && (
            <header dir="auto" className="border-b border-slate-200 bg-linear-to-l from-[#10284f] to-[#16477f] px-4 py-5 text-white sm:px-6 sm:py-7">
              <h1 className="text-2xl font-black leading-tight sm:text-3xl">{content.label}</h1>
            </header>
          )}

          <article
            className={`
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
              ${content.isFullWidth ? "" : "p-4 sm:p-6 md:p-8"}
            `}
            dangerouslySetInnerHTML={{ __html: htmlToRender }}
          />
        </section>
      </div>
    </main>
  );
};

export default HomePage;
