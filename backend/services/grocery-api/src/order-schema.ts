import { z } from "zod";

const orderLineItemSchema = z.object({
    productId: z.number().int().positive(),
    quantity: z.number().positive(),
    totalPrice: z.number().nonnegative(),
});

const sumItemTotalPrices = (items: z.infer<typeof orderLineItemSchema>[]) =>
    items.reduce((sum, item) => sum + item.totalPrice, 0);

const moneyEquals = (left: number, right: number) =>
    Math.round(left * 100) === Math.round(right * 100);

export const createOrderBodySchema = z
    .object({
        phone: z.string().trim().min(1),
        addressId: z.number().int().positive(),
        items: z.array(orderLineItemSchema).min(1),
        preAuthPrice: z.number().nonnegative(),
        deliveryComment: z.string().trim().optional(),
    })
    .refine(
        (body) => new Set(body.items.map((item) => item.productId)).size === body.items.length,
        { message: "Duplicate productId values are not allowed in items" },
    )
    .refine(
        (body) => moneyEquals(body.preAuthPrice, sumItemTotalPrices(body.items)),
        { message: "preAuthPrice must equal the sum of item totalPrice values" },
    );

export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;
export type CreateOrderLineItem = z.infer<typeof orderLineItemSchema>;

export class OrderValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "OrderValidationError";
    }
}

export const parseCreateOrderBody = (body: unknown): CreateOrderBody => {
    const result = createOrderBodySchema.safeParse(body);

    if (!result.success) {
        const message = result.error.issues.map((issue) => issue.message).join("; ");
        throw new OrderValidationError(message);
    }

    return result.data;
};
