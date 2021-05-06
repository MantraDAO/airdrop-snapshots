import BN from "bignumber.js";
import path = require("path");
import { readdir, readFile } from "fs-extra";

export const ZERO_ADDRESS = "0x".padEnd(42, "0");
export const ZERO_WORD = "0x".padEnd(66, "0");
export const ONE_TOKEN = new BN(10).pow(18);

export async function findBearingSnapshot<T>(dir: string, snapshotBlockNumber: number): Promise<T> {
  const snapshotedBlocksNumbers = await readdir(dir).then((res) => {
    return res.filter((s) => /^(0|[1-9]\d*)\.json$/.test(s)).map((s) => Number(s.slice(0, s.length - 5)));
  });
  let bearingBlockNumber = 0;
  for (const blockNumber of snapshotedBlocksNumbers) {
    if (blockNumber > snapshotBlockNumber) continue;
    if (blockNumber === snapshotBlockNumber) {
      throw new Error(`Snapshot for block #${snapshotBlockNumber} already exists`);
    }
    if (blockNumber > bearingBlockNumber) bearingBlockNumber = blockNumber;
  }
  if (bearingBlockNumber === 0) throw new Error("Bearing snapshot not found");
  return readFile(path.resolve(dir, `${bearingBlockNumber.toString(10)}.json`), "utf-8").then((res) => JSON.parse(res));
}

export function sortedStakedBalances(
  stakedBalances: { [address: string]: BN },
  divByOneToken: boolean = true,
): { [address: string]: string } {
  const sortedBalances = Object.keys(stakedBalances)
  .map<[string, BN]>((address) => [address, stakedBalances[address]])
  .sort((a, b) => {
    if (a[1].gt(b[1])) return -1;
    if (a[1].lt(b[1])) return 1;
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  });
  const result: { [address: string]: string } = {};
  for (const [address, amount] of sortedBalances) {
    result[address] = (divByOneToken ? amount.div(ONE_TOKEN) : amount).toString(10);
  }
  return result;
}
