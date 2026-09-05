// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";

const root = createRoot(document.getElementById("root")!);

root.render(
	// <StrictMode>
	<BrowserRouter>
		{/* --mgmt-header-h is published by ManagementLayout so toasts clear the
		    nav. falls back to 0 everywhere else, nothing out there toasts anyway. */}
		<Toaster
			position="top-right"
			offset={{ top: "calc(var(--mgmt-header-h, 0px) + 12px)" }}
			mobileOffset={{ top: "calc(var(--mgmt-header-h, 0px) + 12px)" }}
		/>
		<App />
	</BrowserRouter>
	// </StrictMode>,
);
