import Web3 from "web3";

import { snapshotOm } from "./snapshot_om";
import { Contract, Snapshot } from "./snapshot_type";
import { snapshotUni } from "./snapshot_uni";
import { findBearingSnapshot } from "./utils";

export async function buildSnapshot<T extends Contract>(
  web3: Web3,
  contract: T,
  blockNumber: number,
  dir: string,
): Promise<Snapshot<T>> {
  const bearingSnapshot = await findBearingSnapshot<Snapshot<T>>(dir, blockNumber);
  switch (contract) {
    case Contract.OM_STAKING: return snapshotOm(web3, blockNumber, bearingSnapshot) as Promise<Snapshot<T>>;
    case Contract.UNI_OM_LP: return snapshotUni(web3, blockNumber, bearingSnapshot as Snapshot<Contract.UNI_OM_LP>);
    default: throw new Error(`Snapshoting "${contract}" contract not implemented`);
  }
}
