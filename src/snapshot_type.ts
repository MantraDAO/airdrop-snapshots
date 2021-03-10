export enum Contract {
  OM_STAKING = "om",
  UNI_OM_LP = "uni",
  OM_NFT = "om_nft",
  OM2 = "om2",
}

interface OmStakingSnapshot {
  blockNumber: number;
  totalStaked: string;
  stakedBalances: { [address: string]: string };
}

export type Snapshot<T extends Contract> = {
  [Contract.OM_STAKING]: OmStakingSnapshot;
  [Contract.UNI_OM_LP]: OmStakingSnapshot & { omPrice: string };
  [Contract.OM_NFT]: { blockNumber: number; totalSupply: string; balances: { [address: string]: string } };
  [Contract.OM2]: { blockNumber: number; totalSupply: string; balances: { [address: string]: string } };
}[T];
