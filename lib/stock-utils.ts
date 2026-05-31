import { logger } from "@/lib/logger";
import {
  findProductById,
  updateProductStockById,
} from "@/lib/data/products";
import { IOrderItem } from "@/lib/domain/types";

/**
 * Helper function to safely get stock value from either Map or plain object
 * @param stock - Stock field from product (could be Map or plain object)
 * @param size - Size to check
 * @returns Stock quantity for the size
 */
function getStockValue(stock: any, size: string): number {
  if (!stock) return 0;

  // If it's a Map (from Mongoose), use .get()
  if (stock instanceof Map || (stock && typeof stock.get === "function")) {
    return stock.get(size) || 0;
  }

  // If it's a plain object (from JSON serialization), use bracket notation
  return stock[size] || 0;
}

/**
 * Safely converts stock (which might be a Map or plain object) to a plain Record.
 */
function safeStockToRecord(stock: any): Record<string, number> {
  if (!stock) return {};
  if (stock instanceof Map || (stock && typeof stock.get === "function")) {
    const record: Record<string, number> = {};
    stock.forEach((value: number, key: string) => {
      record[key] = value;
    });
    return record;
  }
  return { ...stock } as Record<string, number>;
}

/**
 * Validates if sufficient stock exists for order items
 * @param items - Array of order items to validate
 * @returns Promise<{ valid: boolean, outOfStockItems: { productId: string, size: string, requestedQty: number, availableQty: number }[] }>
 */
export async function validateStock(items: IOrderItem[]): Promise<{
  valid: boolean;
  outOfStockItems: {
    productId: string;
    size: string;
    requestedQty: number;
    availableQty: number;
  }[];
}> {
  const outOfStockItems: {
    productId: string;
    size: string;
    requestedQty: number;
    availableQty: number;
  }[] = [];

  for (const item of items) {
    try {
      const product = await findProductById(item.productId);
      if (!product) {
        outOfStockItems.push({
          productId: item.productId,
          size: item.size,
          requestedQty: item.quantity,
          availableQty: 0,
        });
        continue;
      }

      const availableStock = getStockValue(product.stock, item.size);
      if (availableStock < item.quantity) {
        outOfStockItems.push({
          productId: item.productId,
          size: item.size,
          requestedQty: item.quantity,
          availableQty: availableStock,
        });
      }
    } catch (error) {
      logger.error(
        `Error validating stock for product ${item.productId}:`,
        error
      );
      outOfStockItems.push({
        productId: item.productId,
        size: item.size,
        requestedQty: item.quantity,
        availableQty: 0,
      });
    }
  }

  return {
    valid: outOfStockItems.length === 0,
    outOfStockItems,
  };
}

/**
 * Reduces stock quantities for order items
 * @param items - Array of order items to reduce stock for
 * @returns Promise<{ success: boolean, errors: string[] }>
 */
export async function reduceStock(items: IOrderItem[]): Promise<{
  success: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  for (const item of items) {
    try {
      const product = await findProductById(item.productId);
      if (!product) {
        errors.push(`Product ${item.productId} not found`);
        continue;
      }

      const currentStock = getStockValue(product.stock, item.size);
      const nextStock = currentStock - item.quantity;

      if (nextStock < 0) {
        errors.push(
          `Insufficient stock for product ${item.productId}, size ${item.size}`
        );
        continue;
      }

      const nextProductStock = {
        ...safeStockToRecord(product.stock),
        [item.size]: nextStock,
      };

      await updateProductStockById(item.productId, nextProductStock);
      logger.info(
        `✅ Stock reduced for product ${item.productId}, size ${item.size}: ${currentStock} → ${nextStock}`
      );
    } catch (error) {
      logger.error(
        `Error reducing stock for product ${item.productId}:`,
        error
      );
      errors.push(
        `Failed to update stock for product ${item.productId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Restores stock quantities for order items (used for order cancellation)
 * @param items - Array of order items to restore stock for
 * @returns Promise<{ success: boolean, errors: string[] }>
 */
export async function restoreStock(items: IOrderItem[]): Promise<{
  success: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  for (const item of items) {
    try {
      const product = await findProductById(item.productId);
      if (!product) {
        errors.push(`Product ${item.productId} not found`);
        continue;
      }

      const currentStock = getStockValue(product.stock, item.size);
      const nextStock = currentStock + item.quantity;

      const nextProductStock = {
        ...safeStockToRecord(product.stock),
        [item.size]: nextStock,
      };

      await updateProductStockById(item.productId, nextProductStock);
      logger.info(
        `✅ Stock restored for product ${item.productId}, size ${item.size}: ${currentStock} → ${nextStock}`
      );
    } catch (error) {
      logger.error(
        `Error restoring stock for product ${item.productId}:`,
        error
      );
      errors.push(
        `Failed to restore stock for product ${item.productId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Gets current stock for a specific product and size
 * @param productId - Product ID
 * @param size - Size to check
 * @returns Promise<number> - Current stock quantity
 */
export async function getCurrentStock(
  productId: string,
  size: string
): Promise<number> {
  try {
    const product = await findProductById(productId);
    if (!product) {
      return 0;
    }

    return getStockValue(product.stock, size);
  } catch (error) {
    logger.error(
      `Error getting current stock for product ${productId}:`,
      error
    );
    return 0;
  }
}
