import { describe, expect, it } from "vitest";

import { OrderValidationError, parseCreateOrderBody } from "./order-schema";

const validBody = {
    phone: "0501234567",
    addressId: 1,
    items: [{ productId: 1001, quantity: 2, totalPrice: 15 }],
    preAuthPrice: 15,
    deliveryComment: "Leave at door",
};

describe("parseCreateOrderBody", () => {
    it("accepts a valid order body", () => {
        expect(parseCreateOrderBody(validBody)).toEqual(validBody);
    });

    it("rejects empty items array", () => {
        expect(() =>
            parseCreateOrderBody({
                ...validBody,
                items: [],
            }),
        ).toThrow(OrderValidationError);
    });

    it("rejects duplicate product ids", () => {
        expect(() =>
            parseCreateOrderBody({
                ...validBody,
                items: [
                    { productId: 1001, quantity: 1, totalPrice: 5 },
                    { productId: 1001, quantity: 2, totalPrice: 10 },
                ],
            }),
        ).toThrow(/Duplicate productId/);
    });

    it("rejects non-positive quantity", () => {
        expect(() =>
            parseCreateOrderBody({
                ...validBody,
                items: [{ productId: 1001, quantity: 0, totalPrice: 5 }],
            }),
        ).toThrow(OrderValidationError);
    });

    it("accepts decimal quantity for weightable products", () => {
        const body = {
            ...validBody,
            items: [{ productId: 1001, quantity: 1.25, totalPrice: 8.5 }],
            preAuthPrice: 8.5,
        };

        expect(parseCreateOrderBody(body).items[0]?.quantity).toBe(1.25);
    });

    it("rejects preAuthPrice that does not match item totalPrice sum", () => {
        expect(() =>
            parseCreateOrderBody({
                ...validBody,
                preAuthPrice: 20,
            }),
        ).toThrow(/preAuthPrice must equal the sum of item totalPrice values/);
    });

    it("accepts preAuthPrice equal to sum of multiple line totals", () => {
        const body = {
            ...validBody,
            items: [
                { productId: 1001, quantity: 2, totalPrice: 15 },
                { productId: 1002, quantity: 1, totalPrice: 6.9 },
            ],
            preAuthPrice: 21.9,
        };

        expect(parseCreateOrderBody(body).preAuthPrice).toBe(21.9);
    });
});
