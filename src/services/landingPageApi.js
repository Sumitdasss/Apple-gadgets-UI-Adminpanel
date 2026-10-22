const API_URL = "https://apple-gadgets-ui-backend.vercel.app";
const BASE = `${API_URL}/api/landing-pages`;

async function request(path = "", options = {}) {
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };

  // Let the browser set the multipart boundary for FormData.
  if (isFormData) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  }

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { message: text || "Invalid server response." };
  }

  if (!response.ok) {
    console.error("Landing Page API Error:", {
      status: response.status,
      path,
      result,
    });

    throw new Error(
      result.message || `Request failed with status ${response.status}`,
    );
  }

  return result;
}

export const landingPageApi = {
  getAll: () => request("/getLandingPages"),

  getById: (id) =>
    request(`/getLandingPage/${encodeURIComponent(id)}`),

  create: (formData) =>
    request("/createLandingPage", {
      method: "POST",
      body: formData,
    }),

  update: (id, data) =>
    request(`/updateLandingPage/${encodeURIComponent(id)}`, {
      method: "PUT",
      body:
        data instanceof FormData
          ? data
          : JSON.stringify(data),
    }),

  setStatus: (id, status) =>
    request(
      `/updateLandingPageStatus/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    ),

  remove: (id) =>
    request(`/deleteLandingPage/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};
