# Airdrop-Snapshots

## Preparations
* Install dependencies: `$ yarn`
* Provide infura api key (see [#Configuration](#configuration))

## Create snapshot
* For OM staking contract: `$ yarn snapshot:om`
* For UNI OM LP staking contract: `$ yarn snapshot:uni`

## Configuration
All configs can be overrided in `config/local.json` file or by using process enviroments.

Available options:
* `INFURA_API_KEY` - api key of infura project (required)
* `SNAPSHOT_BLOCK_NUMBER` - block number to snapshot (default: `null`). If equals to `null`, `0`, `"0"` or empty string, then the latest ethereum block will be used. **Note**: Since there is no event of reward staking in the OM staking contract, `SNAPSHOT_BLOCK_NUMBER` should be no earlier than 128 blocks ago from the current moment
* `CONTRACTS_ADDRESSES`
  * `OM_STAKING` - address of OM staking contract (default: `0x2bcd929283ad0ee603e743412ddb214b91fbab88`). Environment variable: `OM_STAKING_CONTRACT_ADDRESS`
  * `UNI_OM_LP` - address of UNI OM LP staking contract (default: `0x659236870915601d8b581e4355bd822483fe5739`). Environment variable: `UNI_OM_LP_CONTRACT_ADDRESS`

## Snapshoting time proximation
* OM staking contract: 2-3 minutes, since there is no event of reward staking in the OM staking contract
* UNI OM LP staking contract: 3-5 seconds
