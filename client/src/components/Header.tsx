import { Link } from "react-router-dom";

type HeaderProps = {
	// the toggle only matters while the sidebar is a drawer, so it is opt in
	showSidebarToggle?: boolean;
	onToggleSidebar?: () => void;
};

const Header = function ({ showSidebarToggle = false, onToggleSidebar }: HeaderProps) {
	return (
		<header dir="rtl" className="border-b border-slate-700 bg-gray-800 px-4 py-3 text-white sm:px-6 sm:py-4">
			<div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 lg:justify-end">
				{showSidebarToggle && (
					<button
						type="button"
						onClick={onToggleSidebar}
						aria-label="פתיחת התפריט"
						className="rounded-md border border-slate-600 p-2 text-slate-200 transition-colors hover:border-[#00AEEF] hover:text-[#00AEEF] lg:hidden"
					>
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
				)}

				<Link
					to="/management"
					className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 no-underline transition-colors hover:border-[#00AEEF] hover:text-[#00AEEF]"
				>
					ניהול
				</Link>
			</div>
		</header>
	);
};

export default Header;
