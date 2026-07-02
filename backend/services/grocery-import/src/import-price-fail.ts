export class ImportPriceFail extends Error {
    constructor(
        readonly fileName: string,
        readonly cause: unknown,
    ) {
        const message = cause instanceof Error ? cause.message : String(cause);
        super(`CSV price import failed for ${fileName}: ${message}`);
        this.name = "ImportPriceFail";
    }
}
