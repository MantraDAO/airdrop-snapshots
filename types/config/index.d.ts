declare module "config" {
  export const INFURA_API_KEY: string;
  export const SNAPSHOT_BLOCK_NUMBER: number | null;
  export const CONTRACTS_ADDRESSES: {
    readonly OM_STAKING: string;
    readonly UNI_OM_LP: string;
  };
}
