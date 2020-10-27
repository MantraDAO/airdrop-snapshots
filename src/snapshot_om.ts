import BN from "bignumber.js";
import { CONTRACTS_ADDRESSES } from "config";
import Web3 from "web3";

import { Contract, Snapshot as GenericSnapshot } from "./snapshot_type";
import { ONE_TOKEN, sortedStakedBalances } from "./utils";

const BATCH_SIZE = 100;

type Snapshot = GenericSnapshot<Contract.OM_STAKING>;

export async function snapshotOm(web3: Web3, blockNumber: number, bearingSnapshot: Snapshot): Promise<Snapshot> {
  const bearingBlockNumber = bearingSnapshot.blockNumber;
  const indexedAddresses = new Set(Object.keys(bearingSnapshot.stakedBalances));
  const logs = await web3.eth.getPastLogs({
    address: CONTRACTS_ADDRESSES.OM_STAKING,
    fromBlock: bearingBlockNumber + 1,
    toBlock: blockNumber,
    topics: ["0x9e71bc8eea02a63969f509818f2dafb9254532904319f9dbda79b67bd34a5f3d"],
  });
  for (const log of logs) indexedAddresses.add(`0x${log.topics[1].slice(26)}`.toLowerCase());
  console.log("Indexed addresses count:", indexedAddresses.size);
  const stakedBalances: { [address: string]: BN } = {};
  let totalStaked = new BN(0);
  const indexedAddressesList = [...indexedAddresses];
  for (let i = 0; i < indexedAddressesList.length; i += BATCH_SIZE) {
    const progress = i / indexedAddressesList.length;
    console.log(`${(progress * 100).toFixed(2)}%`);
    await Promise.all(indexedAddressesList.slice(i, i + BATCH_SIZE).map(async (address) => {
      const amount = await web3.eth.call({
        to: CONTRACTS_ADDRESSES.OM_STAKING,
        data: "0x70a08231" + address.slice(2).padStart(64, "0"),
      }, blockNumber).then((res) => new BN(res.slice(2), 16));
      stakedBalances[address] = amount;
      if (amount.gt(new BN(0))) totalStaked = totalStaked.plus(amount);
    }));
  }
  return {
    blockNumber,
    totalStaked: totalStaked.div(ONE_TOKEN).toString(10),
    stakedBalances: sortedStakedBalances(stakedBalances),
  };
}
