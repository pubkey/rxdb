export declare const PREMIUM_FLAG_HASH = "6da4936d1425ff3a5c44c02342c6daf791d266be3ae8479b8ec59e261df41b93";
export declare const NON_PREMIUM_COLLECTION_LIMIT = 16;
/**
 * Here we check if the premium flag has been set.
 * This code exists in the open source version of RxDB.
 * Yes you are allowed to fork the repo and just overwrite this function.
 * However you might better spend this time developing your real project
 * and supporting the RxDB efforts by buying premium.
 */
export declare function hasPremiumFlag(): Promise<boolean>;
