"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Package,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API_BASE =
  "https://apple-gadgets-ui-backend.vercel.app";

const ProductListView = () => {
  /* =========================================================
     STATE
  ========================================================= */

  const [products, setProducts] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  /* =========================================================
     FETCH PRODUCTS
  ========================================================= */

  const fetchProducts = async (searchValue = "", pageNumber = 1) => {
    try {
      setLoading(true);
      setError("");

      const url =
        `${API_BASE}/api/dashboard/products` +
        `?search=${encodeURIComponent(searchValue)}` +
        `&page=${pageNumber}` +
        `&limit=10`;

      const response = await fetch(url);

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Server returned invalid response (${response.status})`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            `Failed to load products (${response.status})`
        );
      }

      /*
        Backend response support:

        {
          success: true,
          products: [],
          totalPages: 5
        }

        OR

        {
          success: true,
          data: [],
          totalPages: 5
        }

        OR

        []
      */

      const productList = Array.isArray(data)
        ? data
        : data?.products ||
          data?.data ||
          [];

      setProducts(productList);

      setTotalPages(
        Number(
          data?.totalPages ||
            data?.pagination?.totalPages ||
            1
        )
      );
    } catch (err) {
      console.error(
        "PRODUCT LIST ERROR:",
        err
      );

      setProducts([]);

      setError(
        err?.message ||
          "Failed to load products"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    fetchProducts("", 1);
  }, []);

  /* =========================================================
     SEARCH
  ========================================================= */

  const handleSearch = (e) => {
    e.preventDefault();

    setPage(1);

    fetchProducts(search, 1);
  };

  /* =========================================================
     CLEAR SEARCH
  ========================================================= */

  const clearSearch = () => {
    setSearch("");
    setPage(1);

    fetchProducts("", 1);
  };

  /* =========================================================
     PAGINATION
  ========================================================= */

  const goToPage = (newPage) => {
    if (
      newPage < 1 ||
      newPage > totalPages ||
      loading
    ) {
      return;
    }

    setPage(newPage);

    fetchProducts(search, newPage);
  };

  /* =========================================================
     IMAGE
  ========================================================= */

  const getImage = (product) => {
    if (
      Array.isArray(product?.images) &&
      product.images.length > 0
    ) {
      return product.images[0];
    }

    return "/images.png";
  };

  /* =========================================================
     PRICE
  ========================================================= */

  const formatPrice = (price) => {
    return Number(
      price || 0
    ).toLocaleString("en-BD");
  };

  /* =========================================================
     STOCK
  ========================================================= */

  const getStockStatus = (stock) => {
    const value = Number(stock || 0);

    if (value <= 0) {
      return {
        text: "Out of Stock",
        className:
          "bg-red-50 text-red-600",
      };
    }

    if (value <= 5) {
      return {
        text: "Low Stock",
        className:
          "bg-yellow-50 text-yellow-600",
      };
    }

    return {
      text: "In Stock",
      className:
        "bg-green-50 text-green-600",
    };
  };

  /* =========================================================
     CATEGORY NAME
  ========================================================= */

  const getCategoryName = (product) => {
    /*
      If backend populate করে name পাঠায়:
      product.category.name

      না হলে ObjectId দেখাবে
    */

    if (
      product?.category &&
      typeof product.category === "object"
    ) {
      return (
        product.category.name ||
        product.category.title ||
        "Category"
      );
    }

    return product?.category
      ? String(product.category).slice(-8)
      : "-";
  };

  /* =========================================================
     VIEW
  ========================================================= */

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 p-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <div className="flex items-center gap-2">

              <Package
                size={22}
                className="text-[#b40000]"
              />

              <h2 className="text-lg font-bold text-gray-800">
                Product List
              </h2>

            </div>

            <p className="mt-1 text-xs text-gray-500">
              Manage all products from your admin panel.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              fetchProducts(
                search,
                page
              )
            }
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

        </div>

      </div>


      {/* =====================================================
          SEARCH
      ===================================================== */}

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
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
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


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}


      {/* =====================================================
          PRODUCT TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1100px] text-sm">

            <thead className="border-b border-gray-200 bg-gray-50">

              <tr>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Product
                </th>

                <th className="px-4 py-4 text-left font-semibold text-gray-600">
                  SKU
                </th>

                <th className="px-4 py-4 text-left font-semibold text-gray-600">
                  Price
                </th>

                <th className="px-4 py-4 text-left font-semibold text-gray-600">
                  Stock
                </th>

                <th className="px-4 py-4 text-left font-semibold text-gray-600">
                  Category
                </th>

                <th className="px-4 py-4 text-center font-semibold text-gray-600">
                  Variants
                </th>

                <th className="px-4 py-4 text-center font-semibold text-gray-600">
                  Status
                </th>

                <th className="px-4 py-4 text-center font-semibold text-gray-600">
                  Actions
                </th>

              </tr>

            </thead>


            <tbody>

              {loading ? (

                <tr>
                  <td
                    colSpan="8"
                    className="py-16 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-3">

                      <RefreshCw
                        size={24}
                        className="animate-spin"
                      />

                      <span>
                        Loading products...
                      </span>

                    </div>
                  </td>
                </tr>

              ) : products.length === 0 ? (

                <tr>
                  <td
                    colSpan="8"
                    className="py-16 text-center text-gray-500"
                  >
                    <Package
                      size={40}
                      className="mx-auto mb-3 text-gray-300"
                    />

                    <p className="font-semibold">
                      No products found
                    </p>

                    <p className="mt-1 text-xs">
                      Try another search.
                    </p>
                  </td>
                </tr>

              ) : (

                products.map((product) => {

                  const stockStatus =
                    getStockStatus(
                      product.stock
                    );

                  return (
                    <tr
                      key={
                        product._id ||
                        product.id
                      }
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >

                      {/* PRODUCT */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <img
                            src={getImage(
                              product
                            )}
                            alt={
                              product.name ||
                              "Product"
                            }
                            className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 object-contain"
                          />

                          <div className="min-w-0">

                            <p className="max-w-[280px] truncate font-semibold text-gray-800">
                              {product.name}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {product.brand ||
                                "No Brand"}
                            </p>

                            {product.isNew && (
                              <span className="mt-1 inline-block rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                                NEW
                              </span>
                            )}

                          </div>

                        </div>

                      </td>


                      {/* SKU */}

                      <td className="px-4 py-4">

                        <span className="font-mono text-xs text-gray-600">
                          {product.sku ||
                            "-"}
                        </span>

                      </td>


                      {/* PRICE */}

                      <td className="px-4 py-4">

                        <div>

                          <p className="font-bold text-gray-800">
                            ৳{" "}
                            {formatPrice(
                              product.discountPrice ||
                                product.price
                            )}
                          </p>

                          {product.discountPrice &&
                            Number(
                              product.discountPrice
                            ) <
                              Number(
                                product.price
                              ) && (
                              <p className="text-xs text-gray-400 line-through">
                                ৳{" "}
                                {formatPrice(
                                  product.price
                                )}
                              </p>
                            )}

                        </div>

                      </td>


                      {/* STOCK */}

                      <td className="px-4 py-4">

                        <div className="flex flex-col gap-1">

                          <span className="font-semibold">
                            {product.stock ??
                              0}
                          </span>

                          <span
                            className={`w-fit rounded-full px-2 py-1 text-[10px] font-semibold ${stockStatus.className}`}
                          >
                            {
                              stockStatus.text
                            }
                          </span>

                        </div>

                      </td>


                      {/* CATEGORY */}

                      <td className="px-4 py-4">

                        <span className="text-xs text-gray-600">
                          {
                            getCategoryName(
                              product
                            )
                          }
                        </span>

                      </td>


                      {/* VARIANTS */}

                      <td className="px-4 py-4 text-center">

                        <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">

                          {Array.isArray(
                            product.variants
                          )
                            ? product
                                .variants
                                .length
                            : 0}

                        </span>

                      </td>


                      {/* STATUS */}

                      <td className="px-4 py-4">

                        <div className="flex flex-col items-center gap-1">

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              product.isActive
                                ? "bg-green-50 text-green-600"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {product.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>

                          {product.isFeatured && (
                            <span className="text-[10px] font-medium text-orange-500">
                              Featured
                            </span>
                          )}

                        </div>

                      </td>


                      {/* ACTIONS */}

                      <td className="px-4 py-4">

                        <div className="flex items-center justify-center gap-2">

                          <button
                            type="button"
                            title="View"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            <Eye
                              size={15}
                            />
                          </button>

                        
                          <button
                            type="button"
                            title="Delete"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2
                              size={15}
                            />
                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                })

              )}

            </tbody>

          </table>

        </div>


        {/* =====================================================
            PAGINATION
        ===================================================== */}

        {products.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">

            <p className="text-xs text-gray-500">
              Page{" "}
              <span className="font-semibold text-gray-700">
                {page}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-700">
                {totalPages}
              </span>
            </p>


            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() =>
                  goToPage(page - 1)
                }
                disabled={
                  page === 1 ||
                  loading
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft
                  size={16}
                />
              </button>


              <span className="px-2 text-sm font-semibold text-gray-700">
                {page}
              </span>


              <button
                type="button"
                onClick={() =>
                  goToPage(page + 1)
                }
                disabled={
                  page >= totalPages ||
                  loading
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight
                  size={16}
                />
              </button>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};

export default ProductListView;