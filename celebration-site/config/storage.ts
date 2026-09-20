import rawStorageConfig from "./storage.json"

export const storageConfig = rawStorageConfig
export type PackingVideoMimeType = keyof typeof storageConfig.packingVideoTypes
