


import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Package,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import UpdateProductPage from "./UpdateProduct";

const API_BASE = "https://apple-gadgets-ui-backend.vercel.app";

const API = {
  list: `${API_BASE}/api/dashboard/products`,
  details: (id) => `${API_BASE}/products/${id}`,
  delete: (id) => `${API_BASE}/products/${id}`,
};

export default function ProductListView() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editProductId, setEditProductId] = useState(null);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Safely read JSON API responses.
  const readResponse = async (response) => {
    const text = await response.text();

    let result;

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        `Invalid server response (${response.status}). Check the API URL.`,
      );
    }

    if (!response.ok || result?.success === false) {
      throw new Error(
        result?.message || `Request failed (${response.status})`,
      );
    }

    return result;
  };

  // Extract products from different API response formats.
  const getProductList = (result) => {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.products)) return result.products;
    if (Array.isArray(result?.data?.products)) return result.data.products;
    if (Array.isArray(result?.data?.data)) return result.data.data;
    if (Array.isArray(result?.data)) return result.data;

    return [];
  };

  // Fetch product list.
  const fetchProducts = useCallback(async (searchValue = "", pageNumber = 1) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        search: searchValue,
        page: String(pageNumber),
        limit: "10",
      });

      const response = await fetch(`${API.list}?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const result = await readResponse(response);

      const productList = getProductList(result);

      const pages = Number(
        result?.totalPages ??
          result?.pagination?.totalPages ??
          result?.data?.totalPages ??
          result?.data?.pagination?.totalPages ??
          1,
      );

      setProducts(productList);
      setTotalPages(Math.max(1, pages));
    } catch (err) {
      console.error("FETCH PRODUCTS ERROR:", err);
      setProducts([]);
      setTotalPages(1);
      setError(err.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts("", 1);
  }, [fetchProducts]);

  // Get product ID.
  const getProductId = (product) => product?._id || product?.id || "";

  // Get product image.
  const getImage = (product) => {
    if (Array.isArray(product?.images) && product.images.length > 0) {
      const image = product.images[0];

      if (typeof image === "string") return image;
      if (image?.url) return image.url;
    }

    if (product?.image) {
      return typeof product.image === "string"
        ? product.image
        : product.image?.url || "/images.png";
    }

    return "/images.png";
  };

  // Format price.
  const formatPrice = (price) =>
    Number(price || 0).toLocaleString("en-BD");

  // Get category name.
  const getCategoryName = (product) => {
    const category = product?.category;

    if (category && typeof category === "object") {
      return category.name || category.title || "-";
    }

    return category ? String(category) : "-";
  };

  // Stock status.
  const getStockStatus = (stock) => {
    const value = Number(stock || 0);

    if (value <= 0) {
      return {
        text: "Out of Stock",
        className: "bg-red-50 text-red-600",
      };
    }

    if (value <= 5) {
      return {
        text: "Low Stock",
        className: "bg-yellow-50 text-yellow-700",
      };
    }

    return {
      text: "In Stock",
      className: "bg-green-50 text-green-700",
    };
  };

  // Search products.
  const handleSearch = async (e) => {
    e.preventDefault();

    setPage(1);
    await fetchProducts(search.trim(), 1);
  };

  // Clear search.
  const clearSearch = async () => {
    setSearch("");
    setPage(1);

    await fetchProducts("", 1);
  };

  // Pagination.
  const goToPage = async (newPage) => {
    if (newPage < 1 || newPage > totalPages || loading) return;

    setPage(newPage);
    await fetchProducts(search.trim(), newPage);
  };

  // Refresh list.
  const handleRefresh = () => {
    fetchProducts(search.trim(), page);
  };

  // Open product details.
  const openProductDetails = async (product) => {
    const id = getProductId(product);

    if (!id) {
      setError("Product ID is missing.");
      return;
    }

    setSelectedProduct(product);
    setModalError("");
    setModalLoading(true);

    try {
      const response = await fetch(API.details(id), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const result = await readResponse(response);

      const fullProduct =
        result?.data?.product ||
        result?.data?.data ||
        result?.product ||
        result?.data ||
        result;

      if (
        !fullProduct ||
        !(fullProduct._id || fullProduct.id)
      ) {
        throw new Error("Product details not found.");
      }

      setSelectedProduct(fullProduct);
    } catch (err) {
      console.error("PRODUCT DETAILS ERROR:", err);
      setModalError(err.message || "Failed to load product details.");
    } finally {
      setModalLoading(false);
    }
  };

  // Close details modal.
  const closeModal = () => {
    setSelectedProduct(null);
    setModalError("");
  };

  // Open the complete UpdateProductPage.
  const handleEditProduct = (product) => {
    const id = getProductId(product);

    if (!id) {
      setError("Product ID is missing.");
      return;
    }

    setSelectedProduct(null);
    setEditProductId(id);
  };

  // Return from edit page and refresh the list.
  const handleBackFromEdit = async () => {
    setEditProductId(null);
    await fetchProducts(search.trim(), page);
  };

  // Delete product.
  const handleDeleteProduct = async (product) => {
    const id = getProductId(product);

    if (!id) {
      setError("Product ID is missing.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name || "this product"}"?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      const response = await fetch(API.delete(id), {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      await readResponse(response);

      const nextPage =
        products.length === 1 && page > 1 ? page - 1 : page;

      setPage(nextPage);

      await fetchProducts(search.trim(), nextPage);
    } catch (err) {
      console.error("DELETE PRODUCT ERROR:", err);
      setError(err.message || "Failed to delete product.");
    } finally {
      setDeletingId("");
    }
  };

  // Show the full edit page instead of the product list.
  if (editProductId) {
    return (
      <UpdateProductPage
        key={editProductId}
        productId={editProductId}
        onBack={handleBackFromEdit}
        onUpdated={handleBackFromEdit}
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Package size={22} className="text-[#b40000]" />

                <h2 className="text-lg font-bold text-gray-800">
                  Product List
                </h2>
              </div>

              <p className="mt-1 text-xs text-gray-500">
                Manage, view, edit and delete your products.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 md:flex-row"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product name, SKU, brand..."
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#b40000]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#b40000] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#970000] disabled:opacity-50"
            >
              Search
            </button>

            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="ml-3"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Product table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-gray-800">
              All Products
            </h3>

            <span className="text-sm text-gray-500">
              {loading ? "Loading products..." : `${products.length} products on this page`}
            </span>
          </div>

          {loading && products.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center text-gray-500">
              <RefreshCw size={22} className="mr-3 animate-spin" />
              Loading products...
            </div>
          ) : error && products.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              Unable to load products. Check your API URL and try Refresh.
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={38} className="mx-auto mb-3 text-gray-300" />

              <p className="font-semibold text-gray-700">
                No products found
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Try another search term.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Price</th>
                    <th className="px-5 py-4">Stock</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {products.map((product) => {
                    const id = getProductId(product);
                    const stockStatus = getStockStatus(product.stock);

                    return (
                      <tr
                        key={id || product.name}
                        className="transition hover:bg-gray-50"
                      >
                        {/* Product */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={getImage(product)}
                              alt={product.name || "Product"}
                              className="h-14 w-14 rounded-lg border border-gray-200 bg-white object-contain p-1"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/images.png";
                              }}
                            />

                            <div className="min-w-0">
                              <p className="max-w-xs truncate font-semibold text-gray-800">
                                {product.name || "Unnamed product"}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                SKU: {product.sku || "-"}
                              </p>

                              {product.brand && (
                                <p className="mt-1 text-xs text-gray-500">
                                  {product.brand}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4 text-gray-600">
                          {getCategoryName(product)}
                        </td>

                        {/* Price */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-800">
                            ৳{formatPrice(product.discountPrice || product.price)}
                          </p>

                          {Number(product.discountPrice) > 0 &&
                            Number(product.discountPrice) < Number(product.price) && (
                              <p className="mt-1 text-xs text-gray-400 line-through">
                                ৳{formatPrice(product.price)}
                              </p>
                            )}
                        </td>

                        {/* Stock */}
                        <td className="px-5 py-4">
                          <span className="font-medium text-gray-700">
                            {product.stock ?? 0}
                          </span>

                          <p
                            className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium ${stockStatus.className}`}
                          >
                            {stockStatus.text}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              product.isActive === false
                                ? "bg-gray-100 text-gray-600"
                                : "bg-green-50 text-green-700"
                            }`}
                          >
                            {product.isActive === false ? "Inactive" : "Active"}
                          </span>

                          {product.isFeatured && (
                            <p className="mt-1 text-xs font-medium text-blue-600">
                              Featured
                            </p>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              title="View product"
                              onClick={() => openProductDetails(product)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 text-blue-600 transition hover:bg-blue-50"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              type="button"
                              title="Edit complete product"
                              onClick={() => handleEditProduct(product)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-green-200 text-green-600 transition hover:bg-green-50"
                            >
                              <Edit size={16} />
                            </button>

                            <button
                              type="button"
                              title="Delete product"
                              disabled={deletingId === id || !id}
                              onClick={() => handleDeleteProduct(product)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === id ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => goToPage(page - 1)}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                {page}
              </span>

              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => goToPage(page + 1)}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
              <div>
                <h2
                  id="product-details-title"
                  className="text-lg font-bold text-gray-800"
                >
                  Product Details
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {selectedProduct.name}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close product details"
              >
                <X size={20} />
              </button>
            </div>

            {modalLoading ? (
              <div className="p-12 text-center text-gray-500">
                <RefreshCw
                  size={28}
                  className="mx-auto mb-3 animate-spin"
                />
                Loading product details...
              </div>
            ) : modalError ? (
              <div className="p-5">
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {modalError}
                </div>
              </div>
            ) : (
              <div className="p-5">
                <img
                  src={getImage(selectedProduct)}
                  alt={selectedProduct.name || "Product"}
                  className="mb-5 h-52 w-full rounded-xl border bg-gray-50 object-contain"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/images.png";
                  }}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Name", selectedProduct.name],
                    ["Brand", selectedProduct.brand],
                    ["SKU", selectedProduct.sku],
                    ["Price", `৳ ${formatPrice(selectedProduct.price)}`],
                    [
                      "Discount Price",
                      `৳ ${formatPrice(selectedProduct.discountPrice)}`,
                    ],
                    ["Stock", selectedProduct.stock ?? 0],
                    ["Category", getCategoryName(selectedProduct)],
                    [
                      "Status",
                      selectedProduct.isActive === false ? "Inactive" : "Active",
                    ],
                    [
                      "Variants",
                      Array.isArray(selectedProduct.variants)
                        ? selectedProduct.variants.length
                        : 0,
                    ],
                    ["Featured", selectedProduct.isFeatured ? "Yes" : "No"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">{label}</p>

                      <p className="mt-1 break-words text-sm font-semibold text-gray-800">
                        {value ?? "-"}
                      </p>
                    </div>
                  ))}

                  <div className="rounded-lg bg-gray-50 p-3 sm:col-span-2">
                    <p className="text-xs text-gray-500">Description</p>

                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                      {selectedProduct.description || "No description"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => handleEditProduct(selectedProduct)}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    <Edit size={16} />
                    Edit Complete Product
                  </button>

                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
