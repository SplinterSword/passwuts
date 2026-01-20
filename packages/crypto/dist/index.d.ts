export declare function deriveKey(masterPassword: string, salt: string): Promise<CryptoKey>;
export declare function encryptPassword(password: string, key: CryptoKey): Promise<{
    encryptedPassword: string;
    iv: string;
}>;
export declare function decryptPassword(encryptedPassword: string, iv: string, key: CryptoKey): Promise<string>;
//# sourceMappingURL=index.d.ts.map