import BN from "bignumber.js";
import config = require("config");
import { batchIterate } from "ebatch";
import Web3 from "web3";

import { Contract, Snapshot as GenericSnapshot } from "./snapshot_type";
import { ONE_TOKEN, sortedStakedBalances, ZERO_WORD } from "./utils";

type Snapshot = GenericSnapshot<Contract.CAKE_FINE_LP>;

export async function snapshotFineCake(web3: Web3, blockNumber: number, bearingSnapshot: Snapshot): Promise<Snapshot> {
  const bearingBlockNumber = bearingSnapshot.blockNumber;
  let totalStaked = new BN(bearingSnapshot.totalStaked).times(ONE_TOKEN);
  const stakedBalances: { [address: string]: BN } = {};
  for (const address of Object.keys(bearingSnapshot.stakedBalances)) {
    stakedBalances[address] = new BN(bearingSnapshot.stakedBalances[address]).times(ONE_TOKEN);
  }
  await batchIterate(bearingBlockNumber + 1, blockNumber, +config.BATCH_SIZE, async (from, to) => {
    const progress = (from - bearingBlockNumber - 1) / (blockNumber - bearingBlockNumber);
    console.log((progress * 100).toFixed(2) + "%", [from, to]);
    const logs = await web3.eth.getPastLogs({
      address: config.CONTRACTS_ADDRESSES.CAKE_FINE_LP,
      fromBlock: from,
      toBlock: to,
      topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
    });
    for (const log of logs) {
      let mint = log.topics[1] === ZERO_WORD;
      let burn = log.topics[2] === ZERO_WORD;
      if (!mint && !burn) continue;
      const address = `0x${log.topics[mint ? 2 : 1].slice(26)}`.toLowerCase();
      const amount = new BN(log.data.slice(2), 16).times(mint ? 1 : -1);
      if (!stakedBalances[address]) stakedBalances[address] = new BN(0);
      stakedBalances[address] = stakedBalances[address].plus(amount);
      if (stakedBalances[address].eq(new BN(0))) delete stakedBalances[address];
      totalStaked = totalStaked.plus(amount);
    }
  });
  return {
    blockNumber: blockNumber,
    totalStaked: totalStaked.div(ONE_TOKEN).toString(10),
    stakedBalances: sortedStakedBalances(stakedBalances),
  };
}
