import BN from "bignumber.js";
import config = require("config");
import Web3 from "web3";

import { Contract, Snapshot as GenericSnapshot } from "./snapshot_type";
import { sortedStakedBalances, ZERO_ADDRESS } from "./utils";

type Snapshot = GenericSnapshot<Contract.OM_NFT>;

const TRANSFER_EVENT_SIGNATURE = "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62";
const BATCH_TRANSFER_EVENT_SIGNATURE = "0x4a8f20398c9b8896cedc493e1e816c6d9d9a8e616d0de64d71a59871f3fe5c3c";

export async function snapshotOmNft(web3: Web3, blockNumber: number, bearingSnapshot: Snapshot): Promise<Snapshot> {
  const bearingBlockNumber = bearingSnapshot.blockNumber;
  let totalSupply = new BN(bearingSnapshot.totalSupply);
  const balances: { [address: string]: BN } = {};
  for (const address of Object.keys(bearingSnapshot.balances)) {
    balances[address] = new BN(bearingSnapshot.balances[address]);
  }
  let logs: { from: string; to: string; nftId: BN; amount: BN }[] = [];
  for (
    let from = bearingBlockNumber, to = from + +config.BATCH_SIZE;
    from <= blockNumber;
    from = to, to += +config.BATCH_SIZE
  ) {
    console.log(`${((from - bearingBlockNumber) / (blockNumber - bearingBlockNumber) * 100).toFixed(2)}%`);
    const newLogs = await web3.eth.getPastLogs({
      address: config.CONTRACTS_ADDRESSES.OM_NFT,
      fromBlock: from + 1,
      toBlock: to,
      topics: [[TRANSFER_EVENT_SIGNATURE, BATCH_TRANSFER_EVENT_SIGNATURE]],
    });
    logs.push(...newLogs.map((log) => {
      const from = `0x${log.topics[2].slice(2).slice(24).toLowerCase()}`;
      const to = `0x${log.topics[3].slice(2).slice(24).toLowerCase()}`;
      const nftId = new BN(log.data.slice(2).slice(0, 64), 16);
      const amount = new BN(log.data.slice(2).slice(64), 16);
      return { from, to, nftId, amount };
    }).filter((e) => e.nftId.eq(config.OM_NFT_ID)));
  }
  for (const log of logs) {
    if (log.amount.eq(0)) continue;
    if (log.from === ZERO_ADDRESS) totalSupply = totalSupply.plus(log.amount);
    else {
      balances[log.from] = balances[log.from].minus(log.amount);
      if (balances[log.from].eq(0)) delete balances[log.from];
    }
    if (!balances[log.to]) balances[log.to] = new BN(0);
    balances[log.to] = balances[log.to].plus(log.amount);
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
