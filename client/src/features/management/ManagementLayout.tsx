import { Outlet, NavLink, Link } from "react-router-dom";
import { useEffect, useRef } from "react";

export default function ManagementLayout() {
  const headerRef = useRef<HTMLElement>(null);

  // toasts come out top-right and so does the nav, so they land right on top of
  // it and you have to wait them out before you can click anything. publish the
  // header height and the Toaster sits just under it instead. measured, not
  // hardcoded, because the header wraps on narrow screens (65px up to 163px).
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const publishHeight = () => document.documentElement.style.setProperty("--mgmt-header-h", `${header.offsetHeight}px`);
    publishHeight();

    const observer = new ResizeObserver(publishHeight);
    observer.observe(header);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--mgmt-header-h");
    };
  }, []);

  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    `
    relative flex items-center px-4 py-3 text-sm font-semibold transition-all
    ${
      isActive
        ? "text-blue-700"
        : "text-slate-500 hover:text-slate-800"
    }
    after:absolute after:bottom-0 after:right-0 after:h-0.5 after:w-full after:rounded-full after:transition-all
    ${
      isActive
        ? "after:bg-blue-600 after:opacity-100"
        : "after:bg-transparent after:opacity-0 hover:after:bg-slate-300 hover:after:opacity-100"
    }
  `;

  return (
    <div dir="rtl" className="flex h-full flex-col bg-slate-50">
      <header ref={headerRef} className="border-b border-slate-200 bg-white/90 px-4 shadow-sm backdrop-blur sm:px-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3 md:h-16 md:flex-nowrap md:py-0">

          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
              <NavLink to="/management/content" className={getLinkClass}>
              ניהול תוכן
              </NavLink>

              <NavLink to="/management/media"  className={getLinkClass}>
                ניהול מדיה
              </NavLink>
            </nav>

            <Link
              to="/"
              className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 no-underline transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
              </svg>
              חזרה לדף הבית
            </Link>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Management
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              System administration panel
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50 p-3 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}