export interface SigningOptions {
    /**
     * The data of the Android keystore signing file.
     */
    file: Uint8Array | null;
    alias: string;
    fullName: string;
    organization: string;
    organizationalUnit: string;
    countryCode: string;
    keyPassword: string;
    storePassword: string;
}

export interface LocalKeyFileSigningOptions extends SigningOptions {
    keyFilePath: string;
}