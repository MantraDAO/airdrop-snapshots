import { BSC_NODE_RPC, INFURA_API_KEY, SNAPSHOT_BLOCK_NUMBER } from "config";
import { writeFile } from "fs-extra";
import path = require("path");
import { inspect } from "util";
import Web3 from "web3";

import { buildSnapshot } from "./snapshot";
import { Contract } from "./snapshot_type";

const availableContracts: Contract[] = [
  Contract.OM_STAKING,
  Contract.UNI_OM_LP,
  Contract.CAKE_FINE_LP,
  Contract.OM_NFT,
  Contract.OM2,
  Contract.POLKAPET,
  Contract.POLKAPET2,
  Contract.SOM,
  Contract.SOM2,
  Contract.ZENOM,
];

const BSCContracts: ReadonlySet<Contract> = new Set([Contract.CAKE_FINE_LP]);

export async function snapshot(contract: Contract, blockNumber: number | string | null) {
  const web3 = BSCContracts.has(contract) ? new Web3(BSC_NODE_RPC)
    : new Web3(new Web3.providers.WebsocketProvider(`wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}`, {
      clientConfig: { maxReceivedFrameSize: 5e6, maxReceivedMessageSize: 5e6 },
    }));
  if (typeof blockNumber === "string") blockNumber = +blockNumber;
  else if (!blockNumber) blockNumber = await web3.eth.getBlockNumber().then<number, number>((res) => res - 1);
  const dir = path.resolve(__dirname, "../output/legacy-snapshot-data", contract);
  const snapshot = await buildSnapshot(web3, contract, blockNumber, dir)
  await writeFile(path.resolve(dir, `${blockNumber}.json`), JSON.stringify(snapshot, null, 2) + "\n");
}

if (module === require.main) {
  const contractRaw = process.argv[2];
  if (!(availableContracts as string[]).includes(contractRaw)) {
    throw new Error(`Invalid contract name "${contractRaw}"`);
  }
  const contract = contractRaw as Contract;
  const blockNumber = SNAPSHOT_BLOCK_NUMBER || null;
  snapshot(contract, blockNumber).then(() => {
    console.log("EXIT");
    process.exit(0);
  }).catch((error) => {
    console.error("ERROR");
    console.error(error instanceof Error ? error : inspect(error, false, null, true));
    process.exit(1);
  });
}
