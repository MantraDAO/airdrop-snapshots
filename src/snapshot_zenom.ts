import BN from "bignumber.js";
import config = require("config");
import Web3 from "web3";

import { Contract, Snapshot as GenericSnapshot } from "./snapshot_type";
import { sortedStakedBalances } from "./utils";

type Snapshot = GenericSnapshot<Contract.ZENOM>;

const TRANSFER_EVENT_SIGNATURE = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export async function snapshotZenOm(web3: Web3, blockNumber: number, bearingSnapshot: Snapshot): Promise<Snapshot> {
  const bearingBlockNumber = bearingSnapshot.blockNumber;
  let totalSupply = new BN(bearingSnapshot.totalSupply);
  const balances: { [address: string]: BN } = {};
  for (const address of Object.keys(bearingSnapshot.balances)) {
    balances[address] = new BN(bearingSnapshot.balances[address]);
  }
  let logs: { from: string; to: string; amount: BN }[] = [];
  for (
    let from = bearingBlockNumber, to = from + +config.BATCH_SIZE;
    from <= blockNumber;
    from = to, to += +config.BATCH_SIZE
  ) {
    console.log(`${((from - bearingBlockNumber) / (blockNumber - bearingBlockNumber) * 100).toFixed(2)}%`);
    const newLogs = await web3.eth.getPastLogs({
      address: config.CONTRACTS_ADDRESSES.ZENOM,
      fromBlock: from + 1,
      toBlock: to,
      topics: [TRANSFER_EVENT_SIGNATURE],
    });
    logs.push(...newLogs.map((log) => {
      const from = `0x${log.topics[1].slice(2).slice(24).toLowerCase()}`;
      const to = `0x${log.topics[2].slice(2).slice(24).toLowerCase()}`;
      const amount = new BN(log.data.slice(2), 16);
      return { from, to, amount };
    }));
  }
  for (const log of logs) {
    if (log.amount.eq(0)) continue;
    if (log.from === config.CONTRACTS_ADDRESSES.ZENOM) totalSupply = totalSupply.plus(log.amount);
    else {
      balances[log.from] = balances[log.from].minus(log.amount);
      if (balances[log.from].eq(0)) delete balances[log.from];
    }
    if (log.to === config.CONTRACTS_ADDRESSES.ZENOM) totalSupply = totalSupply.minus(log.amount);
    else {
      if (!balances[log.to]) balances[log.to] = new BN(0);
      balances[log.to] = balances[log.to].plus(log.amount);
    }
  }
  return {
    blockNumber,
    totalSupply: totalSupply.toString(10),
    balances: sortedStakedBalances(Object.keys(balances).reduce<{ [address: string]: BN }>((acc, address) => ({
      ...acc,
      [address]: balances[address],
    }), {}), false),
  };
}
