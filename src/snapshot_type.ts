export enum Contract {
  OM_STAKING = "om",
  UNI_OM_LP = "uni",
  OM_NFT = "om_nft",
  ZENOM = "zenom",
  OM2 = "om2",
  SOM = "som",
  SOM2 = "som2",
  POLKAPET = "polkapet",
  POLKAPET2 = "polkapet2",
  CAKE_FINE_LP = "cake_fine_lp"
}

interface OmStakingSnapshot {
  blockNumber: number;
  totalStaked: string;
  stakedBalances: { [address: string]: string };
}

type Balances = { [address: string]: string };

export type Snapshot<T extends Contract> = {
  [Contract.OM_STAKING]: OmStakingSnapshot;
  [Contract.UNI_OM_LP]: OmStakingSnapshot & { omPrice: string };
  [Contract.CAKE_FINE_LP]: OmStakingSnapshot;
  [Contract.OM_NFT]: { blockNumber: number; totalSupply: string; balances: Balances };
  [Contract.ZENOM]: { blockNumber: number; totalSupply: string; price: string, balances: Balances };
  [Contract.OM2]: { blockNumber: number; totalSupply: string; balances: Balances };
  [Contract.SOM]: { blockNumber: number; totalSupply: string; price: string, balances: Balances };
  [Contract.SOM2]: { blockNumber: number; totalSupply: string; price: string, balances: Balances };
  [Contract.POLKAPET]: { blockNumber: number; totalSupply: string; balances: Balances };
  [Contract.POLKAPET2]: { blockNumber: number; totalSupply: string; balances: Balances };
}[T];
