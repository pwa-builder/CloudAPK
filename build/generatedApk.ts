import { LocalKeyFileSigningOptions } from "./signingOptions";

export interface GeneratedApk {
    filePath: string;
    signingInfo: LocalKeyFileSigningOptions | null;
}