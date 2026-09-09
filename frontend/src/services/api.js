import axios from "axios";

const api = axios.create({
	baseURL: process.env.REACT_APP_BACKEND_URL,
	withCredentials: true,
});

export const openApi = axios.create({
	baseURL: process.env.REACT_APP_BACKEND_URL
});

// ALEQUIZAO: interceptores registrados no módulo (antes de qualquer componente renderizar).
// - toda requisição leva o token do localStorage;
// - 401/403 tenta renovar o token UMA vez (uma renovação por vez) e repete a requisição;
// - só desloga (evento "alequizao-logout") se a renovação falhar ou se o próprio refresh_token devolver 401.
api.interceptors.request.use(
	(config) => {
		try {
			const token = localStorage.getItem("token");
			if (token) config.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
		} catch (e) { /* token inválido no storage */ }
		return config;
	},
	(error) => Promise.reject(error)
);

let renovando = null;
export const renovarToken = () => {
	if (!renovando) {
		renovando = api.post("/auth/refresh_token").then(({ data }) => {
			if (data && data.token) {
				localStorage.setItem("token", JSON.stringify(data.token));
				api.defaults.headers.Authorization = `Bearer ${data.token}`;
			}
			return data;
		}).finally(() => { renovando = null; });
	}
	return renovando;
};

const deslogar = () => {
	localStorage.removeItem("token");
	localStorage.removeItem("companyId");
	api.defaults.headers.Authorization = undefined;
	window.dispatchEvent(new Event("alequizao-logout"));
};

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config || {};
		const status = error?.response?.status;
		const url = originalRequest.url || "";
		const ehAuth = /\/auth\/(refresh_token|login|logout|me)/.test(url);
		if ((status === 403 || status === 401) && !originalRequest._retry && !ehAuth && localStorage.getItem("token")) {
			originalRequest._retry = true;
			try {
				const data = await renovarToken();
				if (data && data.token) {
					originalRequest.headers = { ...(originalRequest.headers || {}), Authorization: `Bearer ${data.token}` };
					return api(originalRequest);
				}
			} catch (e) {
				deslogar();
			}
			return Promise.reject(error);
		}
		if (status === 401 && /\/auth\/refresh_token/.test(url)) deslogar();
		return Promise.reject(error);
	}
);

export default api;
