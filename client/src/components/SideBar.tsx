import { useState, useEffect } from "react";
import useHttp from "../customHooks/useHttp";
import { Link, useLocation } from "react-router-dom";
import { type SideBarCategory, type SideBarArticle } from "../models/SideBarModel";
import { type CategoryMeta } from "../../../server/models/categoryModel";

type SideBarProps = {
	// lets the drawer close itself once a link is taken on small screens
	onNavigate?: () => void;
};

const SideBar = function ({ onNavigate }: SideBarProps) {
	const { makeRequest } = useHttp();
	const [activeCategory, setActiveCategory] = useState<string | null>(null);
	const [categories, setCategories] = useState<SideBarCategory[]>([]);
	const location = useLocation();
	const [, setFoundCategory] = useState<SideBarCategory | null>(null);
	const [foundArticle, setFoundArticle] = useState<SideBarArticle | null>(null);

	useEffect(() => {
		const path = location.pathname.split("/");
		const pathId = path[path.length - 1];
		const foundCat = categories.find((c) => c.articles.find((a) => a.id === pathId));
		if (!foundCat) {
			setActiveCategory(null);
			setFoundArticle(null);
			setFoundCategory(null);
			return;
		}
		const foundArt = foundCat.articles.find((a) => a.id === pathId);
		if (!foundArt) return;
		setFoundCategory(foundCat);
		setFoundArticle(foundArt);
		setActiveCategory(foundCat.id);
	}, [location.pathname, categories]);

	// Load Initial Categories Layout
	useEffect(() => {
		const initialCategories = async () => {
			try {
				const response = await makeRequest({
					url: "/public/categories",
					method: "GET",
				});

				const fetchedCategories = (await response.json()) as CategoryMeta[];

				const formattedCategories: SideBarCategory[] = fetchedCategories.map((cat) => {
					const formattedArticles: SideBarArticle[] = cat.articles
						.filter((article) => {
							if (article.hiddenFromSidebar) {
								return false;
							}
							const hasRedirect = article?.redirectUrl?.trim().length > 0;
							const hasCustomHref = Boolean(article.href?.trim());
							const hasContent = Boolean(article.content?.trim());

							return hasCustomHref || hasContent || hasRedirect;
						})
						.map((article) => {
						let link: string = "";

						// if I embeded another page, link there,
						// otherwise link to content page
						if (article.href) {
							link = article.href;
						} else {
							link = `/content/${article._id}`;
						}

						return {
							id: article._id?.toString() || "",
							label: article.label,
							href: link,
							// if no content set to empty, otherwise update the string
							content: article.content ? article.content : "",
							isFullWidth: article.isFullWidth,
							isHomepage: Boolean(article.isHomepage),
							hiddenFromSidebar: Boolean(article.hiddenFromSidebar),
							redirectUrl: article.redirectUrl
						};
					});

					return {
						id: cat._id?.toString() || "",
						label: cat.label,
						articles: formattedArticles,
						sortIndex: cat.sortIndex,
					};
				}).filter((cat) => cat.articles.length > 0);

				// display categories sorted by sortIndex
				formattedCategories.sort((a, b) => a.sortIndex - b.sortIndex);

				setCategories(formattedCategories);
				return;
			} catch (error) {
				console.error(`Something went wrong. Err: ${error}`);
				return;
			}
		};

		initialCategories();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const linkStyles =
		"block px-6 py-3 text-base font-medium tracking-wide transition-all duration-200 border-r-4 border-transparent cursor-pointer hover:bg-white/10 hover:border-[#00AEEF] hover:text-[#00AEEF]";
	const toggleCategory = (categoryId: string) => {
		setActiveCategory((prev) => (prev === categoryId ? null : categoryId));
	};

	return (
		<aside className="flex h-dvh w-72 max-w-[85vw] flex-col overflow-hidden bg-[#0B1E3D] font-sans text-white shadow-2xl lg:h-screen lg:w-64 lg:max-w-none">
			<nav className="flex min-h-0 flex-1 flex-col">
				{/* Header Logo */}
				<div className="relative flex h-24 shrink-0 items-center justify-center border-b border-[#1F3A5F] bg-[#091830]">
					<Link to="/" onClick={onNavigate} className="block h-full w-full px-3 transition-opacity hover:opacity-90" aria-label="Go to homepage">
						<img src="/logo.svg" alt="טוב לדעת" className="h-full w-full object-contain" />
					</Link>

					<button
						type="button"
						onClick={onNavigate}
						aria-label="סגירת התפריט"
						className="absolute left-2 top-2 rounded-md p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
					>
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Categories - scroll only here */}
				<div
					className="min-h-0 flex-1 overflow-y-auto py-4
scrollbar-thin
    scrollbar-track-transparent
    scrollbar-thumb-[#1F3A5F]
    hover:scrollbar-thumb-[#00AEEF]

    [&::-webkit-scrollbar]:w-2
    [&::-webkit-scrollbar-track]:bg-[#081226]
    [&::-webkit-scrollbar-track]:rounded-full
    [&::-webkit-scrollbar-thumb]:bg-[#1F3A5F]
    [&::-webkit-scrollbar-thumb]:rounded-full
    [&::-webkit-scrollbar-thumb]:border-2
    [&::-webkit-scrollbar-thumb]:border-[#081226]
    hover:[&::-webkit-scrollbar-thumb]:bg-[#00AEEF]
    [&::-webkit-scrollbar-thumb]:transition-colors
          "
				>
					{categories.map((category) => (
						<div key={category.id}>
							<button onClick={() => toggleCategory(category.id)} className="group flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[#1F3A5F]">
								<svg
									className={`h-5 w-5 text-gray-400 transition-transform duration-200 group-hover:text-white ${activeCategory === category.id ? "rotate-180" : ""}`}
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
								</svg>
								<h3 className="text-sm font-bold uppercase tracking-wider text-white transition-colors group-hover:text-[#00AEEF]">{category.label}</h3>
							</button>

							{activeCategory === category.id && (
								<ul dir="rtl" className="space-y-1 bg-[#081226] pb-2 shadow-inner">
									{category.articles.map((article) => (
										<li key={article.id} className={article.id === foundArticle?.id ? "border-r-4 border-[#00AEEF] bg-[#00AEEF]/15" : ""}>
											<Link to={article?.redirectUrl ? article.redirectUrl : article.href} onClick={onNavigate} className={linkStyles}>
												{article.label}
											</Link>
										</li>
									))}
								</ul>
							)}
						</div>
					))}
				</div>
			</nav>
		</aside>
	);
};

export default SideBar;
