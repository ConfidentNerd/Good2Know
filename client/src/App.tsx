import { Routes, Route, Navigate } from "react-router-dom";
import ManagementLayout from "./features/management/ManagementLayout";
import ManagementDashboard from "./features/management/ManagementDashboard";
import ManagementPage from "./features/management/content/ManagementPage";
import HomePage from "./features/home/HomePage";
import ContentPage from "./features/content/ContentPage";
import Layout from "./layouts/Layout";
import NotFound from "./features/errorPages/NotFound";

function App() {
	return (
		<Routes>
			<Route path="/" element={<Layout />}>
				<Route index element={<HomePage />} />
				<Route path="content/:articleId" element={<ContentPage />} />
			</Route>
			<Route path="/management" element={<ManagementLayout />}>
				<Route index element={<Navigate to="content" replace />} />
				<Route path="content" element={<ManagementPage />} />
				<Route path="media" element={<ManagementDashboard />} />
			</Route>

			<Route path="*" element={<NotFound />} />
		</Routes>
	);
}

export default App;
