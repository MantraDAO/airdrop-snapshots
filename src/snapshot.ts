import Web3 from "web3";

import { snapshotOm } from "./snapshot_om";
import { snapshotOmNft } from "./snapshot_om_nft";
import { Contract, Snapshot } from "./snapshot_type";
import { snapshotUni } from "./snapshot_uni";
import { snapshotFineCake } from "./snapshot_fine_cake";
import { snapshotZenOm } from "./snapshot_zenom";
import { snapshotOm2 } from "./snapshot_om2";
import { snapshotSom } from "./snapshot_som";
import { snapshotSom2 } from "./snapshot_som2";
import { snapshotPolkapet } from "./snapshot_polkapet";
import { snapshotPolkapet2 } from "./snapshot_polkapet2";
import { findBearingSnapshot } from "./utils";

export async function buildSnapshot<T extends Contract>(
  web3: Web3,
  contract: T,
  blockNumber: number,
  dir: string,
): Promise<Snapshot<T>> {
  const bearingSnapshot = await findBearingSnapshot<Snapshot<T>>(dir, blockNumber);
  switch (contract) {
    case Contract.OM_STAKING:
      return snapshotOm(web3, blockNumber, bearingSnapshot as Snapshot<Contract.OM_STAKING>) as Promise<Snapshot<T>>;
    case Contract.UNI_OM_LP:
      return snapshotUni(web3, blockNumber, bearingSnapshot as Snapshot<Contract.UNI_OM_LP>) as Promise<Snapshot<T>>;
    case Contract.CAKE_FINE_LP:
      return snapshotFineCake(web3, blockNumber, bearingSnapshot as Snapshot<Contract.CAKE_FINE_LP>) as Promise<Snapshot<T>>;
    case Contract.OM_NFT:
      return snapshotOmNft(web3, blockNumber, bearingSnapshot as Snapshot<Contract.OM_NFT>) as Promise<Snapshot<T>>;
    case Contract.ZENOM:
      return snapshotZenOm(web3, blockNumber, bearingSnapshot as Snapshot<Contract.ZENOM>) as Promise<Snapshot<T>>;
    case Contract.OM2:
      return snapshotOm2(web3, blockNumber, bearingSnapshot as Snapshot<Contract.OM2>) as Promise<Snapshot<T>>;
    case Contract.SOM:
      return snapshotSom(web3, blockNumber, bearingSnapshot as Snapshot<Contract.SOM>) as Promise<Snapshot<T>>;
    case Contract.SOM2:
      return snapshotSom2(web3, blockNumber, bearingSnapshot as Snapshot<Contract.SOM2>) as Promise<Snapshot<T>>;
    case Contract.POLKAPET:
      return snapshotPolkapet(
        web3,
        blockNumber,
        bearingSnapshot as Snapshot<Contract.POLKAPET>,
      ) as Promise<Snapshot<T>>;
    case Contract.POLKAPET2:
      return snapshotPolkapet2(
        web3,
        blockNumber,
        bearingSnapshot as Snapshot<Contract.POLKAPET2>,
      ) as Promise<Snapshot<T>>;
    default: throw new Error(`Snapshoting "${contract}" contract not implemented`);
  }
}
