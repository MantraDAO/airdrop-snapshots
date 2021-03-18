import BN from "bignumber.js";
import { BATCH_SIZE, CONTRACTS_ADDRESSES } from "config";
import { batchIterate } from "ebatch";
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
  const blocksToIterate = blockNumber - bearingBlockNumber;
  await batchIterate(bearingBlockNumber + 1, blockNumber, +BATCH_SIZE, async (fromBlock, toBlock) => {
    const passedBlocksCount = fromBlock - bearingBlockNumber - 1;
    console.log(`${(passedBlocksCount / blocksToIterate * 100).toFixed(2).padStart(5, " ")}%`, [fromBlock, toBlock]);
    const logs = await web3.eth.getPastLogs({
      address: CONTRACTS_ADDRESSES.ZENOM,
      fromBlock,
      toBlock,
      topics: [TRANSFER_EVENT_SIGNATURE],
    });
    for (const log of logs) {
      const amount = new BN(log.data.slice(2), 16);
      if (amount.eq(0)) continue;
      const fromAccount = `0x${log.topics[1].slice(2).slice(24).toLowerCase()}`;
      const toAccount = `0x${log.topics[2].slice(2).slice(24).toLowerCase()}`;
      if (fromAccount === CONTRACTS_ADDRESSES.ZENOM) totalSupply = totalSupply.plus(amount);
      else {
        balances[fromAccount] = balances[fromAccount].minus(amount);
        if (balances[fromAccount].eq(0)) delete balances[fromAccount];
      }
      if (toAccount === CONTRACTS_ADDRESSES.ZENOM) totalSupply = totalSupply.minus(amount);
      else {
        if (!balances[toAccount]) balances[toAccount] = new BN(0);
        balances[toAccount] = balances[toAccount].plus(amount);
      }
    }
  });
  const price = await web3.eth.call({
    to: CONTRACTS_ADDRESSES.ZENOM,
    data: "0x182df0f5",
  }, blockNumber).then((res) => new BN(res.slice(2), 16));
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
