import BN from "bignumber.js";
import { BATCH_SIZE, CONTRACTS_ADDRESSES } from "config";
import { batchIterate, generatePairs } from "ebatch";
import Web3 from "web3";

import { Contract, Snapshot as GenericSnapshot } from "./snapshot_type";
import { sortedStakedBalances, ZERO_ADDRESS } from "./utils";

type Snapshot = GenericSnapshot<Contract.SOM>;

const TRANSFER_EVENT_SIGNATURE = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const PRICE_UPDATED_EVENT_SIGNATURE = "0x15819dd2fd9f6418b142e798d08a18d0bf06ea368f4480b7b0d3f75bd966bc48";

export async function snapshotSom(web3: Web3, blockNumber: number, bearingSnapshot: Snapshot): Promise<Snapshot> {
  const bearingBlockNumber = bearingSnapshot.blockNumber;
  let price = new BN(bearingSnapshot.price);
  let totalSupply = new BN(bearingSnapshot.totalSupply);
  const balances: { [address: string]: BN } = {};
  for (const address of Object.keys(bearingSnapshot.balances)) {
    balances[address] = new BN(bearingSnapshot.balances[address]);
  }
  const blocksToIterate = blockNumber - bearingBlockNumber;
  await batchIterate(bearingBlockNumber + 1, blockNumber, +BATCH_SIZE, async (fromBlock, toBlock) => {
    const passedBlocksCount = fromBlock - bearingBlockNumber - 1;
    console.log(`${(passedBlocksCount / blocksToIterate * 100).toFixed(2).padStart(5, " ")}%`, [fromBlock, toBlock]);
    const logs = await web3.eth.getPastLogs({
      address: CONTRACTS_ADDRESSES.SOM,
      fromBlock,
      toBlock,
      topics: [TRANSFER_EVENT_SIGNATURE],
    });
    for (const log of logs) {
      const amount = new BN(log.data.slice(2), 16);
      if (amount.eq(0)) continue;
      const fromAccount = `0x${log.topics[1].slice(2).slice(24).toLowerCase()}`;
      const toAccount = `0x${log.topics[2].slice(2).slice(24).toLowerCase()}`;
      if (fromAccount === ZERO_ADDRESS) totalSupply = totalSupply.plus(amount);
      else {
        balances[fromAccount] = balances[fromAccount].minus(amount);
        if (balances[fromAccount].eq(0)) delete balances[fromAccount];
      }
      if (toAccount === ZERO_ADDRESS) totalSupply = totalSupply.minus(amount);
      else {
        if (!balances[toAccount]) balances[toAccount] = new BN(0);
        balances[toAccount] = balances[toAccount].plus(amount);
      }
    }
  });
  const pairs = generatePairs(bearingBlockNumber + 1, blockNumber, +BATCH_SIZE);
  pairs.reverse();
  for (const [from, to] of pairs) {
    const logs = await web3.eth.getPastLogs({
      address: CONTRACTS_ADDRESSES.SOM,
      fromBlock: from,
      toBlock: to,
      topics: [PRICE_UPDATED_EVENT_SIGNATURE],
    });
    if (logs.length) {
      const latestLog = logs[logs.length - 1];
      price = new BN(latestLog.data.slice(2).slice(0, 64), 16);
      break;
    }
  }
  return {
    blockNumber,
    totalSupply: totalSupply.toString(10),
    price: price.toString(10),
    balances: sortedStakedBalances(Object.keys(balances).reduce<{ [address: string]: BN }>((acc, address) => ({
      ...acc,
      [address]: balances[address],
    }), {}), false),
  };
}
