export enum Contract {
  OM_STAKING = "om",
  UNI_OM_LP = "uni",
}

interface OmStakingSnapshot {
  blockNumber: number;
  totalStaked: string;
  stakedBalances: { [address: string]: string };
}

export type Snapshot<T extends Contract> = {
  [Contract.OM_STAKING]: OmStakingSnapshot;
  [Contract.UNI_OM_LP]: OmStakingSnapshot & { omPrice: string };
}[T];
