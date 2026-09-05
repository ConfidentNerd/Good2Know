import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Layout = function () {
  const location = useLocation();
  // below lg the sidebar is an off canvas drawer, so it needs an open/closed state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // list of paths that should not have a sidebar
  const sidebarExcludedPaths = ["/management/content"];

	// check if the current path is exactly an excluded path OR a sub-route of one
	const hideSidebar = sidebarExcludedPaths.some(path => 
		location.pathname === path || location.pathname.startsWith(`${path}/`)
	);

	// picking a link on mobile should leave the drawer closed on the new page,
	// including when the move came from the browser back button
	const [lastPath, setLastPath] = useState(location.pathname);
	if (lastPath !== location.pathname) {
		setLastPath(location.pathname);
		setIsSidebarOpen(false);
	}

	// escape closes the drawer
	useEffect(() => {
		if (!isSidebarOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsSidebarOpen(false);
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isSidebarOpen]);

	return (
		<div className="flex h-dvh overflow-hidden">
			<div className="flex flex-1 flex-col overflow-auto">
				<Header showSidebarToggle={!hideSidebar} onToggleSidebar={() => setIsSidebarOpen(true)} />

				<main>
					<Outlet />
				</main>

				<Footer />
			</div>

			{!hideSidebar && (
				<>
					{/* drawer backdrop, never shown from lg up where the sidebar is always in view */}
					{isSidebarOpen && (
						<div
							onClick={() => setIsSidebarOpen(false)}
							className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
							aria-hidden="true"
						/>
					)}

					{/* slides in from the right below lg, plain flex column from lg up */}
					<div
						className={`fixed inset-y-0 right-0 z-40 transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:flex-none lg:translate-x-0 lg:transition-none ${
							isSidebarOpen ? "translate-x-0" : "translate-x-full"
						}`}
					>
						<SideBar onNavigate={() => setIsSidebarOpen(false)} />
					</div>
				</>
			)}
		</div>
	);
};

export default Layout;
