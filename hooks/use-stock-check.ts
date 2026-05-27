import { useState, useEffect } from "react";

interface StockCheckResult {
  stock: number;
  isLoading: boolean;
  error: string | null;
}

export function useStockCheck(
  productId: string,
  size: string,
  enabled: boolean = true
): StockCheckResult {
  const [stock, setStock] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !productId || !size) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const checkStock = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = new URL("/api/products/stock", window.location.origin);
        url.searchParams.set("productId", productId);
        url.searchParams.set("size", size);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!isMounted) {
          return;
        }

        if (data.success) {
          setStock(data.stock);
        } else {
          setError(data.error || "Failed to check stock");
          setStock(-1); // Use -1 to indicate an error state vs 0 (actually out of stock)
        }
      } catch (err: unknown) {
        // Safely check for AbortError without assuming Error instance
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        if (!isMounted) {
          return;
        }

        const message =
          err instanceof Error ? err.message : "Failed to check stock";
        setError(message);
        setStock(-1); // Use -1 to indicate error state
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkStock();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [productId, size, enabled]);

  return { stock, isLoading, error };
}

export default useStockCheck;
