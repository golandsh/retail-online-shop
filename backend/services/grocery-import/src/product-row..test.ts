import { describe, expect, it } from "vitest";

import { CsvRowValidationError, normalizeProductRow } from "./product-row";

describe("normalizeProductRow", () => {
    it("normalizes supported CSV headers into a GDS product row", () => {
        const row = normalizeProductRow(
            {
                ProductID: " 1001 ",
                description: " Milk 3 Percent ",
                IsWeightable: "false",
                CategoryID: "1",
                CategoryName: " Dairy Products ",
                SubCategoryID: "10",
                SubCategoryName: " Milk ",
                ImageURL: "https://example.com/milk.jpg",
                Price: " 7.50 ",
            },
            2,
        );

        expect(row).toEqual({
            productId: 1001,
            description: "Milk 3 Percent",
            isWeightable: false,
            categoryId: 1,
            categoryName: "Dairy Products",
            subCategoryId: 10,
            subCategoryName: "Milk",
            imageUrl: "https://example.com/milk.jpg",
            price: 7.5,
        });
    });

    it("accepts category name without category id", () => {
        const row = normalizeProductRow(
            {
                description: "Bananas",
                IsWeightable: "yes",
                CategoryName: "Produce",
                Price: "4",
            },
            2,
        );

        expect(row.categoryId).toBeUndefined();
        expect(row.categoryName).toBe("Produce");
        expect(row.isWeightable).toBe(true);
    });

    it("throws a row validation error when category identity is missing", () => {
        expect(() =>
            normalizeProductRow(
                {
                    description: "Milk",
                    IsWeightable: "false",
                    Price: "7.50",
                },
                4,
            ),
        ).toThrow(CsvRowValidationError);
    });

    it("throws a row validation error for invalid rows", () => {
        expect(() =>
            normalizeProductRow(
                {
                    ProductID: "abc",
                    description: "",
                    IsWeightable: "maybe",
                    CategoryName: "Dairy",
                    Price: "not-a-price",
                },
                4,
            ),
        ).toThrow(CsvRowValidationError);
    });
});
