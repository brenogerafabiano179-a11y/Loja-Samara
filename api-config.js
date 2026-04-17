window.ESSENCE_SAM_API_URL = "https://loja-samara-production.up.railway.app/api";

const explicitApiUrl = window.ESSENCE_SAM_API_URL || "";
const normalizedExplicitApiUrl = explicitApiUrl.trim().replace(/\/$/, "");
const isLocalFile = window.location.protocol === "file:";

window.ESSENCE_SAM_API = {
    baseUrl: normalizedExplicitApiUrl || (isLocalFile ? "http://localhost:3000/api" : `${window.location.origin}/api`),
    enabled: true
};
