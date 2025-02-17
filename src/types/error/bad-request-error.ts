export type BadRequestError =  Error & {
    errorType: "BadRequestError";
    message: string;
};