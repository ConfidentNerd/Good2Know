import { useState } from "react";


type Props = {
	url: string;
	method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
	data?: BodyInit | null | undefined; // can be an object will go through JSON.parse
	headers?: object
};
export default function useHttp() {
	const [isLoading, setIsLoading] = useState(false);
	const BASE_URL = import.meta.env.VITE_APP_BASE_URL ?? "/api";
	const makeRequest = async (props: Props) => {
		try {
			setIsLoading(() => true);
			const response = await fetch(
				BASE_URL + props.url,
				{
					credentials: "include",
					headers: {
						"x-token": window.localStorage.getItem("t") || ""
						, ...props.headers
					},
					method: props.method,
					body: props.data,

				});
			if (response.status >= 400) {
				setIsLoading(() => false);
				const error = (await response.json())
				throw new Error(JSON.stringify(error))
			}
			setIsLoading(() => false);
			return response;
		} catch (error: unknown) {
			setIsLoading(() => false);
			if (error instanceof Error) throw error;
			throw new Error(String(error));
		}
	};

	return {
		makeRequest,
		isLoading
	}
}