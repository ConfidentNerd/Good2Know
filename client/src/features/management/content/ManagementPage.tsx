import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { type SideBarArticle, type SideBarCategory } from "../../../models/SideBarModel";
import useHttp from "../../../customHooks/useHttp";
import type { CategoryMeta } from "../../../../../server/models/categoryModel";
import { Editor } from "@hugerte/hugerte-react";
import { templates } from "./templates";

export default function ManagementPage() {

	// initialize useStates

	// categories for sidebar and metadata
	const [categories, setCategories] = useState<SideBarCategory[]>([]);
	// holds the content of the current editor
	const [editorContent, setEditorContent] = useState<string>("");
	// controls if selected page renders in fullwidth
	const [isFullWidth, setIsFullWidth] = useState<boolean>(false);
	// controls if selected page is homepage
	const [isHomepage, setIsHomepage] = useState<boolean>(false);
	// controls if selected page is hidden from sidebar
	const [hiddenFromSidebar, setHiddenFromSidebar] = useState<boolean>(false);
	// index of current selected article that is being edited
	const [selectedArticle, setSelectedArticle] = useState<{ categoryIndex: number; articleIndex: number } | null>(null);
	const [confirmDialog, setConfirmDialog] = useState<{
		isOpen: boolean;
		title: string;
		message: string;
		confirmLabel: string;
		action: { type: "deleteCategory"; categoryIndex: number } | { type: "deleteArticle"; categoryIndex: number; articleIndex: number } | null;
	}>({
		isOpen: false,
		title: "",
		message: "",
		confirmLabel: "",
		action: null,
	});
	const [promptDialog, setPromptDialog] = useState<{
		isOpen: boolean;
		title: string;
		placeholder: string;
		confirmLabel: string;
		action:
		| { type: "addCategory" }
		| { type: "renameCategory"; categoryIndex: number }
		| { type: "addArticle"; categoryIndex: number }
		| { type: "renameArticle"; categoryIndex: number; articleIndex: number }
		| { type: "redirectUrl"; categoryIndex: number; articleIndex: number }
		| null;
	}>({
		isOpen: false,
		title: "",
		placeholder: "",
		confirmLabel: "",
		action: null,
	});
	const [promptValue, setPromptValue] = useState<string>("");
	// the rich text editor takes its height once at init, so size it for this screen
	const [editorHeight] = useState<number>(() => (window.innerWidth < 1024 ? 420 : 600));
	const editorPanelRef = useRef<HTMLDivElement>(null);

	// http request usestate
	const { makeRequest } = useHttp();
	const rtl = (text: string) => `\u200F${text}\u200F`;
	// get article url to be used inside the view page button
	const getArticleUrl = (article: SideBarArticle) => (article.redirectUrl ? article.redirectUrl : `${window.location.origin}/content/${article.id}`);

	interface BlobInfo {
		base64: () => void;
		blob: () => Blob;
		blobUri: () => void;
		filename: () => void;
		id: () => void;
		name: () => void;
		uri: () => void;
	}

	const imageUploadHandler = async (blobInfo: BlobInfo) => {
		const formData = new FormData();
		formData.append("image", blobInfo.blob());

		const response = await makeRequest({
			url: "/management/uploadImage",
			method: "POST",
			data: formData,
		});

		const data = await response.json();
		const base = import.meta.env.VITE_APP_BASE_URL ?? "/api";
		return base + "/public" + data.url;
	};

	// Load Initial Categories Layout
	useEffect(() => {
		const initialCategories = async () => {
			try {
				const response = await makeRequest({
					url: "/management/categories",
					method: "GET",
				});

				const fetchedCategories = (await response.json()) as CategoryMeta[];

				const formattedCategories: SideBarCategory[] = fetchedCategories.map((cat) => {
					const formattedArticles: SideBarArticle[] = cat.articles.map((article) => {
						return {
							id: article._id?.toString() || "",
							label: article.label,
							href: article.href,
							content: article.content,
							isFullWidth: article.isFullWidth,
							isHomepage: Boolean(article.isHomepage),
							hiddenFromSidebar: Boolean(article.hiddenFromSidebar),
							redirectUrl: article.redirectUrl,
						};
					});

					return {
						id: cat._id?.toString() || "",
						label: cat.label,
						articles: formattedArticles,
						sortIndex: cat.sortIndex,
					};
				});

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

	/****   functions  ****/
	const addCategory = async (name: string) => {
		if (name.trim() === "") {
			toast.error(rtl("שם הקטגוריה לא יכול להיות ריק"));
			return;
		}

		try {
			const response = await makeRequest({
				url: "/management/addCategory",
				method: "POST",
				headers: { "Content-Type": "application/json" },
				data: JSON.stringify({ label: name }),
			});

			const result = await response.json();

			setCategories([
				...categories,
				{
					id: result._id,
					sortIndex: result.sortIndex,
					label: name,
					articles: [],
				},
			]);
		} catch (error) {
			console.error(`Something went wrong. Err: ${error}`);
			return;
		}
	};

	const renameCategory = async (index: number, newName: string) => {
		if (newName.trim() === "") {
			toast.error(rtl("שם הקטגוריה לא יכול להיות ריק"));
			return;
		}

		try {
			await makeRequest({
				url: "/management/renameCategory",
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				data: JSON.stringify({ id: categories[index].id, newLabel: newName }),
			});
		} catch (error) {
			console.error(`Something went wrong. Err: ${error}`);
			toast.error(rtl("שינוי השם נכשל. נסה שוב."));
			return;
		}

		const newCats = [...categories];
		// Copy the specific category object before changing it
		newCats[index] = { ...newCats[index], label: newName };
		setCategories(newCats);
	};

	const requestAddCategory = () => {
		setPromptValue("");
		setPromptDialog({
			isOpen: true,
			title: rtl("קטגוריה חדשה"),
			placeholder: rtl("שם הקטגוריה"),
			confirmLabel: rtl("שמירה"),
			action: { type: "addCategory" },
		});
	};

	const requestRenameCategory = (categoryIndex: number) => {
		setPromptValue(categories[categoryIndex].label);
		setPromptDialog({
			isOpen: true,
			title: rtl("שינוי שם קטגוריה"),
			placeholder: rtl("שם קטגוריה"),
			confirmLabel: rtl("עדכון"),
			action: { type: "renameCategory", categoryIndex },
		});
	};

	const deleteCategory = async (index: number) => {
		try {
			await makeRequest({
				url: `/management/category/${categories[index].id}`,
				method: "DELETE",
			});
		} catch (error) {
			console.error(`Something went wrong. Err: ${error}`);
			toast.error(rtl("מחיקת הקטגוריה נכשלה. נסה שוב."));
			return;
		}

		setCategories(categories.filter((_, i) => i !== index));
	};

	const requestDeleteCategory = (categoryIndex: number) => {
		setConfirmDialog({
			isOpen: true,
			title: rtl("מחיקת קטגוריה"),
			message: rtl(`האם למחוק את "${categories[categoryIndex].label}"?`),
			confirmLabel: rtl("מחיקה"),
			action: { type: "deleteCategory", categoryIndex },
		});
	};

	const moveCategory = async (index: number, direction: "up" | "down") => {
		const newCats = [...categories];
		const targetIndex = direction === "up" ? index - 1 : index + 1;

		// boundary check prevents moving top item up or bottom item down
		if (targetIndex >= 0 && targetIndex < newCats.length) {
			const currentCategory = newCats[index];
			const adjacentCategory = newCats[targetIndex];

			try {
				await makeRequest({
					url: `/management/moveCategory`,
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					data: JSON.stringify({
						currentCategoryId: currentCategory.id,
						adjacentCategoryId: adjacentCategory.id,
					}),
				});
			} catch (error) {
				console.error(`Something went wrong. Err: ${error}`);
				toast.error(rtl("הזזת הקטגוריה נכשלה. נסה שוב."));
				return;
			}

			// refresh frontend to correct order
			const temp = newCats[index];
			newCats[index] = newCats[targetIndex];
			newCats[targetIndex] = temp;

			setCategories(newCats);
		}
	};

	const moveArticle = async (catIndex: number, articleIndex: number, direction: "up" | "down") => {
		const targetIndex = direction === "up" ? articleIndex - 1 : articleIndex + 1;
		const targetCategory = categories[catIndex];
		const currentArticles = targetCategory.articles;

		// boundry check
		if (targetIndex >= 0 && targetIndex < currentArticles.length) {
			const currentArticle = currentArticles[articleIndex];
			const targetArticle = currentArticles[targetIndex];

			try {
				await makeRequest({
					url: `/management/moveArticle`,
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					data: JSON.stringify({
						targetCategoryId: targetCategory.id,
						currentArticleId: currentArticle.id,
						adjacentArticleId: targetArticle.id,
					}),
				});
			} catch (error) {
				console.error(`Something went wrong. Err: ${error}`);
				toast.error(rtl("הזזת העמוד נכשלה. נסה שוב."));
				return;
			}

			// refresh UI
			const newCats = [...categories];

			// create a copy of the category and its articles array
			newCats[catIndex] = {
				...newCats[catIndex],
				articles: [...currentArticles],
			};

			// swap items inside the new articles array
			const newArticles = newCats[catIndex].articles;

			const temp = newArticles[articleIndex];
			newArticles[articleIndex] = newArticles[targetIndex];
			newArticles[targetIndex] = temp;

			setCategories(newCats);
		}
	};

	const addArticle = async (catIndex: number, name: string) => {
		if (name.trim() === "") {
			toast.error("שם העמוד לא יכול להיות ריק");
			return;
		}

		try {
			const categoryId = categories[catIndex].id;

			const response = await makeRequest({
				url: "/management/addArticle",
				method: "POST",
				headers: { "Content-Type": "application/json" },
				data: JSON.stringify({ label: name, categoryId: categoryId }),
			});

			const result = await response.json();

			const newCats = [...categories];

			newCats[catIndex] = {
				...newCats[catIndex],

				articles: [...newCats[catIndex].articles, { id: result._id, label: name, href: "", content: "", isFullWidth: false, isHomepage: false, hiddenFromSidebar: false, redirectUrl: "" }],
			};

			setCategories(newCats);
		} catch (error) {
			console.error(`Something went wrong. Err: ${error}`);
			return;
		}
	};

	const renameArticle = async (catIndex: number, articleIndex: number, newName: string) => {
		if (newName.trim() === "") {
			toast.error(rtl("שם העמוד לא יכול להיות ריק"));
			return;
		}

		try {
			await makeRequest({
				url: "/management/renameArticle",
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				data: JSON.stringify({
					categoryId: categories[catIndex].id,
					articleId: categories[catIndex].articles[articleIndex].id,
					newLabel: newName,
				}),
			});
		} catch (error) {
			console.error(`Something went wrong. Err: ${error}`);
			toast.error(rtl("שינוי השם נכשל. נסה שוב."));
			return;
		}

		// update article label to new name & update state
		const newCats = [...categories];
		newCats[catIndex] = { ...newCats[catIndex] };
		newCats[catIndex].articles = [...newCats[catIndex].articles];
		newCats[catIndex].articles[articleIndex] = {
			...newCats[catIndex].articles[articleIndex],
			label: newName,
		};

		setCategories(newCats);
	};
	const handleRedirectUrl = async (catIndex: number, articleIndex: number, newUrl: string) => {
		// if (newUrl.trim() === "") {
		// 	toast.error(rtl("שם הכתובת לא יכולה להיות ריקה"));
		// 	return;
		// }

		try {
			await makeRequest({
				url: "/management/handleRedirectUrl",
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				data: JSON.stringify({
					categoryId: categories[catIndex].id,
					articleId: categories[catIndex].articles[articleIndex].id,
					newLabel: newUrl,
				}),
			});
		} catch (error) {
			console.error(`Something went wrong. Err: ${error}`);
			toast.error(rtl("שינוי השם נכשל. נסה שוב."));
			return;
		}

		// update article label to new name & update state
		const newCats = [...categories];
		newCats[catIndex] = { ...newCats[catIndex] };
		newCats[catIndex].articles = [...newCats[catIndex].articles];
		newCats[catIndex].articles[articleIndex] = {
			...newCats[catIndex].articles[articleIndex],
			redirectUrl: newUrl,
		};

		setCategories(newCats);
	};

	const requestAddArticle = (categoryIndex: number) => {
		setPromptValue("");
		setPromptDialog({
			isOpen: true,
			title: rtl("עמוד חדש"),
			placeholder: rtl("שם העמוד"),
			confirmLabel: rtl("שמירה"),
			action: { type: "addArticle", categoryIndex },
		});
	};

	const requestRenameArticle = (categoryIndex: number, articleIndex: number) => {
		setPromptValue(categories[categoryIndex].articles[articleIndex].label);
		setPromptDialog({
			isOpen: true,
			title: rtl("שינוי שם עמוד"),
			placeholder: rtl("שם העמוד"),
			confirmLabel: rtl("עדכון"),
			action: { type: "renameArticle", categoryIndex, articleIndex },
		});
	};
	const requestRedirectArticle = (categoryIndex: number, articleIndex: number) => {
		setPromptValue(categories[categoryIndex].articles[articleIndex].redirectUrl);
		setPromptDialog({
			isOpen: true,
			title: rtl("כתובת לניתוב"),
			placeholder: "https://...",
			confirmLabel: rtl("עדכון"),
			action: { type: "redirectUrl", categoryIndex, articleIndex },
		});
	};

	const deleteArticle = async (catIndex: number, articleIndex: number) => {
		const category = categories[catIndex];
		const articleToDelete = category.articles[articleIndex];

		try {
			await makeRequest({
				url: `/management/category/${category.id}/article/${articleToDelete.id}`,
				method: "DELETE",
			});
		} catch (error) {
			console.error(`Something went wrong. Err: ${error}`);
			toast.error(rtl("מחיקת העמוד נכשלה. נסה שוב."));
			return;
		}

		const newCats = [...categories];
		newCats[catIndex] = {
			...newCats[catIndex],
			articles: newCats[catIndex].articles.filter((_, i) => i !== articleIndex),
		};
		setCategories(newCats);
	};

	const requestDeleteArticle = (categoryIndex: number, articleIndex: number) => {
		setConfirmDialog({
			isOpen: true,
			title: rtl("מחיקת עמוד"),
			message: rtl("למחוק את העמוד הזה?"),
			confirmLabel: rtl("מחיקה"),
			action: { type: "deleteArticle", categoryIndex, articleIndex },
		});
	};

	const closeConfirmDialog = () => {
		setConfirmDialog((prev) => ({
			...prev,
			isOpen: false,
			action: null,
		}));
	};

	const closePromptDialog = () => {
		setPromptDialog((prev) => ({
			...prev,
			isOpen: false,
			action: null,
		}));
		setPromptValue("");
	};

	const handleConfirmAction = async () => {
		if (!confirmDialog.action) return;

		if (confirmDialog.action.type === "deleteCategory") {
			await deleteCategory(confirmDialog.action.categoryIndex);
		}

		if (confirmDialog.action.type === "deleteArticle") {
			await deleteArticle(confirmDialog.action.categoryIndex, confirmDialog.action.articleIndex);
		}

		closeConfirmDialog();
	};

	const handlePromptAction = async () => {
		if (!promptDialog.action) return;

		const value = promptValue.trim();

		if (value === "" && promptDialog.action.type !== "redirectUrl") {
			toast.error(rtl("השדה לא יכול להיות ריק"));
			return;
		}

		if (promptDialog.action.type === "addCategory") {
			await addCategory(value);
		}

		if (promptDialog.action.type === "renameCategory") {
			await renameCategory(promptDialog.action.categoryIndex, value);
		}

		if (promptDialog.action.type === "addArticle") {
			await addArticle(promptDialog.action.categoryIndex, value);
		}

		if (promptDialog.action.type === "renameArticle") {
			await renameArticle(promptDialog.action.categoryIndex, promptDialog.action.articleIndex, value);
		}
		if (promptDialog.action.type === "redirectUrl") {
			await handleRedirectUrl(promptDialog.action.categoryIndex, promptDialog.action.articleIndex, value);
		}

		closePromptDialog();
	};

	const handleEditClick = async (catIndex: number, artIndex: number) => {
		try {
			setSelectedArticle({ categoryIndex: catIndex, articleIndex: artIndex });

			const article = categories[catIndex].articles[artIndex];
			const content = article.content;

			setEditorContent(() => content ? content : "")

			setIsFullWidth(article.isFullWidth);
			setIsHomepage(Boolean(article.isHomepage));
			setHiddenFromSidebar(Boolean(article.hiddenFromSidebar));
		} catch (error) {
			console.error(`Something went wrong. Err: ${error}`);
			toast.error(rtl("טעינת התוכן נכשלה. נסה שוב."));
		}
	};

	// below lg the editor sits under the list, so picking a page has to scroll to it.
	// from lg up both panels are already side by side and nothing should move.
	useEffect(() => {
		if (!selectedArticle) return;
		if (window.innerWidth >= 1024) return;

		requestAnimationFrame(() => {
			editorPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
		});
	}, [selectedArticle]);

	const handleSaveClick = async () => {
		try {
			if (!selectedArticle) return;

			const { categoryIndex, articleIndex } = selectedArticle;
			const category = categories[categoryIndex];
			const article = category.articles[articleIndex];

			await makeRequest({
				url: "/management/updateContent",
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				data: JSON.stringify({
					categoryId: category.id,
					articleId: article.id,
					content: editorContent,
					isFullWidth: isFullWidth,
					isHomepage: isHomepage,
					hiddenFromSidebar: hiddenFromSidebar,
				}),
			});

			// update categories useState to include saved content
			const updatedCategories = [...categories];

			if (isHomepage) {
				for (const categoryItem of updatedCategories) {
					categoryItem.articles = categoryItem.articles.map((articleItem) => ({
						...articleItem,
						isHomepage: false,
					}));
				}
			}

			updatedCategories[categoryIndex] = { ...updatedCategories[categoryIndex] };
			updatedCategories[categoryIndex].articles = [...updatedCategories[categoryIndex].articles];
			updatedCategories[categoryIndex].articles[articleIndex] = {
				...updatedCategories[categoryIndex].articles[articleIndex],
				content: editorContent,
				isFullWidth: isFullWidth,
				isHomepage: isHomepage,
				hiddenFromSidebar: hiddenFromSidebar,
			};

			setCategories(updatedCategories);

			// this hides the content panel
			setSelectedArticle(null);
			setIsFullWidth(false);
			setIsHomepage(false);
			setHiddenFromSidebar(false);

			toast.success(rtl("התוכן נשמר בהצלחה!"));
		} catch (error) {
			console.error(`Something went wrong. Err: ${error}`);
			toast.error(rtl("שמירת התוכן נכשלה. נסה שוב."));
		}
	};

	// -------- render --------
	return (
		<div className="flex min-h-screen flex-col bg-gray-50 font-sans lg:h-screen lg:flex-row">
			{/* RIGHT PANEL: SIDEBAR */}
			<div className="w-full p-4 border-b border-gray-300 flex flex-col lg:w-5/12 lg:p-6 lg:overflow-y-auto lg:border-b-0 lg:border-r">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-bold text-gray-800">ניהול תוכן</h1>
				</div>

				<div className="mb-4">
					<button onClick={requestAddCategory} className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:bg-gray-100 hover:text-blue-600 font-medium">
						+ הוסף קטגוריה חדשה
					</button>
				</div>

				<div className="space-y-6">
					{categories.map((category, catIndex) => {
						const isCatEmpty = category.articles.length === 0;

						return (
							<div
								key={catIndex}
								// Conditional styling: Red border if category has no articles
								className={`bg-white p-4 rounded-lg shadow-sm border transition-all ${isCatEmpty ? "border-red-300 ring-1 ring-red-100" : "border-gray-200"}`}
							>
								{/* Category Header */}
								<div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b pb-2">
									<div className="flex items-center gap-2 flex-1">
										<h2 className={`text-lg font-bold ${isCatEmpty ? "text-red-700" : "text-blue-800"}`}>{category.label}</h2>
										{/* Visual Badge for empty state */}
										{isCatEmpty && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">ריק</span>}
									</div>

									<div className="flex gap-1">
										<button onClick={() => requestRenameCategory(catIndex)} className="text-gray-500 hover:text-blue-600 px-1 text-sm">
											שינוי שם
										</button>
										<button onClick={() => requestDeleteCategory(catIndex)} className="text-gray-500 hover:text-red-600 px-1 text-sm">
											✖
										</button>
										<div className="w-px h-4 bg-gray-300 mx-1"></div>
										<button
											onClick={() => moveCategory(catIndex, "up")}
											disabled={catIndex === 0}
											className="text-gray-500 hover:bg-gray-100 px-1 enabled:hover:text-black disabled:opacity-30"
										>
											▲
										</button>
										<button
											onClick={() => moveCategory(catIndex, "down")}
											disabled={catIndex === categories.length - 1}
											className="text-gray-500 hover:bg-gray-100 px-1 enabled:hover:text-black disabled:opacity-30"
										>
											▼
										</button>
									</div>
								</div>

								{/* Articles List */}
								<ul className="space-y-3">
									{category.articles.map((article, articleIndex) => (
										<li key={articleIndex} className="bg-gray-50 p-3 rounded border border-gray-100 hover:border-blue-200 transition-colors">
											<div className="flex flex-col items-start justify-between gap-2 mb-2 sm:flex-row sm:items-center">
												<span className="font-semibold text-gray-700 flex flex-wrap items-center gap-2">
													<span>{article.label}</span>
													{article.isHomepage && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">דף בית</span>}
													{article.hiddenFromSidebar && <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">מוסתר</span>}
												</span>
												<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
													<a href={getArticleUrl(article)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
														→ צפיה בעמוד
													</a>
													<button onClick={() => requestRedirectArticle(catIndex, articleIndex)} className="text-xs text-blue-600 hover:underline">
														↗ ניתוב לכתובת חיצונית
													</button>
													<button onClick={() => requestRenameArticle(catIndex, articleIndex)} className="text-xs text-blue-600 hover:underline">
														✎ שינוי שם
													</button>

													<button onClick={() => requestDeleteArticle(catIndex, articleIndex)} className="text-xs text-red-600 hover:underline ml-1">
														🗙 מחיקה
													</button>
													<div className="flex flex-col ml-2">
														<button
															onClick={() => moveArticle(catIndex, articleIndex, "up")}
															disabled={articleIndex === 0}
															className="text-[10px] leading-none text-gray-400 enabled:hover:text-black disabled:opacity-30"
														>
															▲
														</button>
														<button
															onClick={() => moveArticle(catIndex, articleIndex, "down")}
															disabled={articleIndex === category.articles.length - 1}
															className="text-[10px] leading-none text-gray-400 enabled:hover:text-black disabled:opacity-30"
														>
															▼
														</button>
													</div>
												</div>
											</div>

											{/* Save Content */}
											{(!article?.redirectUrl || article?.redirectUrl?.length === 0) ? (

												<div className="flex flex-wrap justify-between items-center gap-2 text-sm bg-white p-2 rounded border border-gray-200">
													{article.content ? (
														<span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium truncate flex items-center gap-1">
															📰 <span className="font-bold">קיים תוכן</span>
														</span>
													) : (
														<span className="text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-medium truncate flex items-center gap-1">
															⏳ <span className="font-bold">ממתין</span>
														</span>
													)}
													<button
														onClick={() => handleEditClick(catIndex, articleIndex)}
														className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-medium"
													>
														עריכת תוכן
													</button>
												</div>
											) : (
												<p className="break-all text-xs text-slate-500">{article.redirectUrl}</p>
											)}

										</li>
									))}
									<li className="pt-2">
										<button onClick={() => requestAddArticle(catIndex)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-600 font-medium">
											+ הוסף עמוד
										</button>
									</li>
								</ul>
							</div>
						);
					})}
				</div>
			</div>

			{/* LEFT PANEL: PREVIEW */}
			<div ref={editorPanelRef} className="w-full bg-slate-100 p-4 flex flex-col border-gray-300 lg:w-7/12 lg:p-6 lg:h-full lg:border-l">
				{selectedArticle ? (
					<div className="bg-white rounded-lg shadow-xl overflow-hidden flex flex-col flex-1">
						<div className="bg-slate-800  text-white px-4 py-3 flex flex-wrap justify-between items-center gap-3">
							<span className="font-medium">עורך תוכן</span>
							<div className="flex flex-wrap items-center gap-3 sm:gap-4">
								<label className="flex items-center gap-2 text-sm text-white/90 select-none cursor-pointer">
									<input type="checkbox" checked={isFullWidth} onChange={(e) => setIsFullWidth(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
									<span>עמוד ברוחב מלא</span>
								</label>
								<label className="flex items-center gap-2 text-sm text-white/90 select-none cursor-pointer">
									<input
										type="checkbox"
										checked={isHomepage}
										onChange={(e) => setIsHomepage(e.target.checked)}
										disabled={isHomepage}
										className="h-4 w-4 rounded border-slate-300 disabled:opacity-70"
									/>
									<span>דף בית</span>
								</label>
								<label className="flex items-center gap-2 text-sm text-white/90 select-none cursor-pointer">
									<input type="checkbox" checked={hiddenFromSidebar} onChange={(e) => setHiddenFromSidebar(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
									<span>הסתר מהתפריט</span>
								</label>
								<button onClick={() => handleSaveClick()} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors">
									שמור תוכן
								</button>
							</div>
						</div>

						<div className="flex-1 overflow-auto bg-white p-3 relative sm:p-8">
							<Editor
								value={editorContent}
								onEditorChange={(newContent) => setEditorContent(newContent)}
								init={{
									// configuration
									images_upload_handler: imageUploadHandler,
									height: editorHeight,
									menubar: true,

									templates,

									plugins: [
										"advlist",
										"autolink",
										"lists",
										"link",
										"image",
										"charmap",
										"preview",
										"anchor",
										"searchreplace",
										"visualblocks",
										"code",
										"fullscreen",
										"accordion",
										"insertdatetime",
										"media",
										"table",
										"help",
										"wordcount",
										"codesample",
										"directionality",
										"emoticons",
										"pagebreak",
										"nonbreaking",
										"quickbars",
										"template",
									],

									toolbar:
										"undo redo | blocks | fontfamily fontsize | " +
										"bold italic underline strikethrough | alignleft aligncenter " +
										"alignright alignjustify | outdent indent | numlist bullist | " +
										"forecolor backcolor removeformat | pagebreak | charmap emoticons | " +
										"fullscreen preview save print | insertfile image media link anchor codesample | ltr rtl",
								}}
							/>
						</div>
					</div>
				) : (
					<div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-gray-400">
						<h2>בחר עמוד מהרשימה כדי לערוך את התוכן שלו.</h2>
					</div>
				)}
			</div>

			{confirmDialog.isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4">
					<div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
						<div className="px-6 py-4 border-b border-slate-100">
							<h3 className="text-lg font-bold text-slate-800">{confirmDialog.title}</h3>
						</div>
						<div className="px-6 py-5 text-slate-600">{confirmDialog.message}</div>
						<div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
							<button onClick={closeConfirmDialog} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium">
								{rtl("ביטול")}
							</button>
							<button onClick={handleConfirmAction} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold">
								{confirmDialog.confirmLabel}
							</button>
						</div>
					</div>
				</div>
			)}

			{promptDialog.isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4">
					<div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
						<div className="px-6 py-4 border-b border-slate-100">
							<h3 className="text-lg font-bold text-slate-800">{promptDialog.title}</h3>
						</div>
						<div className="px-6 py-5">
							<input
								autoFocus
								type="text"
								value={promptValue}
								onChange={(e) => setPromptValue(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handlePromptAction();
									}
								}}
								placeholder={promptDialog.placeholder}
								className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
							/>
						</div>
						<div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
							<button onClick={closePromptDialog} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium">
								{rtl("ביטול")}
							</button>
							<button onClick={handlePromptAction} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold">
								{promptDialog.confirmLabel}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
