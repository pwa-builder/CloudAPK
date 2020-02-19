export interface SigningKeyInfo {
    /**
     * The file path where the key store will be generated. 
     */
    keyStorePath: string;
    /**
     * The password for the key store.
     */
    keyStorePassword: string;
    /**
     * The key alias.
     */
    keyAlias: string;
    /**
     * The password of the key.
     */
    keyPassword: string;
    /**
     * The first and last name of the person listed on the key.
     */
    firstAndLastName: string;
    /**
     * The organization or corporation listed on the key.
     */
    organization: string;
    /**
     * The organizational unit (e.g. Engineering Department) listed on the key.
     */
    organizationalUnit: string;
    /**
     * The 2 letter country code listed on the key.
     */
    countryCode: string;
}