declare module "config" {
  export const INFURA_API_KEY: string;
  export const SNAPSHOT_BLOCK_NUMBER: number | null;
  export const BSC_NODE_RPC: string;
  export const CONTRACTS_ADDRESSES: {
    readonly OM_STAKING: string;
    readonly UNI_OM_LP: string;
    readonly OM_NFT: string;
    readonly ZENOM: string;
    readonly OM2: string;
    readonly POLKAPET: string;
    readonly POLKAPET2: string;
    readonly SOM: string;
    readonly SOM2: string;
    readonly CAKE_FINE_LP: string;
  };
  export const OM_NFT_ID: number | string;
  export const POLKAPET_ID: number | string;
  export const POLKAPET2_ID: number | string;
  export const BATCH_SIZE: number | string;
}
