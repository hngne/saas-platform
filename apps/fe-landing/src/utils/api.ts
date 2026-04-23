import axios from "axios";

const isLocalNetworkHost = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

const resolveBaseURL = () => {
  const localBaseUrl = import.meta.env.VITE_API_URL as string | undefined;
  const lanBaseUrl = import.meta.env.VITE_API_URL_T as string | undefined;
  const rawBaseUrl = localBaseUrl || lanBaseUrl || "http://localhost:8080/api";

  if (typeof window === "undefined") return rawBaseUrl;

  const currentHostname = window.location.hostname;
  const preferredBaseUrl =
    isLocalNetworkHost(currentHostname) && !/^localhost|127\.0\.0\.1$/i.test(currentHostname)
      ? lanBaseUrl || rawBaseUrl
      : localBaseUrl || lanBaseUrl || rawBaseUrl;

  try {
    const url = new URL(preferredBaseUrl, window.location.origin);
    const apiHostname = url.hostname;

    if (isLocalNetworkHost(currentHostname) && isLocalNetworkHost(apiHostname)) {
      url.hostname = currentHostname;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return preferredBaseUrl;
  }
};

const api = axios.create({
  baseURL: resolveBaseURL(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
