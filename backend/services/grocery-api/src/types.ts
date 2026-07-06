export interface CatalogProduct {
    productId: string;
    productDesc: string;
    categoryId: string;
    price: number;
    weightable: boolean;
    image?: string;
}

export interface CatalogCategory {
    categoryId: string;
    categoryDesc: string;
    parentID?: string | null;
}

export interface CatalogAddress {
    city: string;
    street: string;
    number: number;
    apartment: number | null;
    postalCode: number;
    notes: string | null;
}

export interface CatalogUser {
    id: string;
    fullName: string;
    phone: string;
    pt: string;
    address: CatalogAddress | null;
}

export interface CityStreetDirectory {
    city: string;
    streets: string[];
}

export interface CatalogResponse {
    products: CatalogProduct[];
    categories: CatalogCategory[];
    cityStreets: CityStreetDirectory[];
    user: CatalogUser | null;
}

export interface CatalogQuery {
    phone?: string;
    userId?: string;
}

export class UserNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UserNotFoundError";
    }
}

export class InvalidCatalogQueryError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidCatalogQueryError";
    }
}

export class AddressNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AddressNotFoundError";
    }
}

export class AddressOwnershipError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AddressOwnershipError";
    }
}

export class ProductNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ProductNotFoundError";
    }
}

export interface CreateOrderResult {
    orderId: string;
    status: string;
    preAuthPrice: number;
    itemCount: number;
}
