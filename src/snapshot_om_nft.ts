import BN from "bignumber.js";
import { BATCH_SIZE, CONTRACTS_ADDRESSES, OM_NFT_ID } from "config";
import { batchIterate } from "ebatch";
import Web3 from "web3";

import { Contract, Snapshot as GenericSnapshot } from "./snapshot_type";
import { sortedStakedBalances, ZERO_ADDRESS } from "./utils";

type Snapshot = GenericSnapshot<Contract.OM_NFT>;

const TRANSFER_EVENT_SIGNATURE = "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62";
const BATCH_TRANSFER_EVENT_SIGNATURE = "0x4a8f20398c9b8896cedc493e1e816c6d9d9a8e616d0de64d71a59871f3fe5c3c";
const topics = [[TRANSFER_EVENT_SIGNATURE, BATCH_TRANSFER_EVENT_SIGNATURE]];

export async function snapshotOmNft(web3: Web3, blockNumber: number, bearingSnapshot: Snapshot): Promise<Snapshot> {
  const bearingBlockNumber = bearingSnapshot.blockNumber;
  let totalSupply = new BN(bearingSnapshot.totalSupply);
  const balances: { [address: string]: BN } = {};
  for (const address of Object.keys(bearingSnapshot.balances)) {
    balances[address] = new BN(bearingSnapshot.balances[address]);
  }
  const blocksToIterate = blockNumber - bearingBlockNumber;
  await batchIterate(bearingBlockNumber + 1, blockNumber, +BATCH_SIZE, async (fromBlock, toBlock) => {
    const passedBlocksCount = fromBlock - bearingBlockNumber - 1;
    console.log(`${(passedBlocksCount / blocksToIterate * 100).toFixed(2).padStart(4, " ")}%`, [fromBlock, toBlock]);
    const logs = await web3.eth.getPastLogs({ address: CONTRACTS_ADDRESSES.OM_NFT, fromBlock, toBlock, topics });
    for (const log of logs) {
      const nftId = new BN(log.data.slice(2).slice(0, 64), 16);
      if (!nftId.eq(OM_NFT_ID)) continue;
      const amount = new BN(log.data.slice(2).slice(64), 16);
      if (amount.eq(0)) continue;
      const fromAccount = `0x${log.topics[2].slice(2).slice(24).toLowerCase()}`;
      const toAccount = `0x${log.topics[3].slice(2).slice(24).toLowerCase()}`;
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
  return {
    blockNumber,
    totalSupply: totalSupply.toString(10),
    balances: sortedStakedBalances(Object.keys(balances).reduce<{ [address: string]: BN }>((acc, address) => ({
      ...acc,
      [address]: balances[address],
    }), {}), false),
  };
}
