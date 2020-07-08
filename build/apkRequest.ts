import { ApkOptions } from "./apkOptions";

/**
 * The data stored inside a request to /generateApk.
 */
export interface ApkRequest {
    /**
     * The ApkOptions passed in the request.
     */
    options: ApkOptions | null;
    /**
     * Validation errors resulting from the request. If populated, this signals the request is malformed.
     */
    validationErrors: string[];
}