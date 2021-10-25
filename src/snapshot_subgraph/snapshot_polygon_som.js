const config_data = require('../../config/default.json');
const ObjectsToCsv = require('objects-to-csv');

const axios = require('axios');
const { default: BigNumber } = require('bignumber.js');

let _offset_stake = 0;
let _offset_unstake = 0;
let _offset_claim = 0;
let _offset_price = 0;

let stakes = [];
let unstakes = [];
let priceUpdates = [];
let claims = [];

let cleanedStakes = [];
let cleanedUnstakes = [];
let cleanedClaims = [];
let snapshot = [];


const BLOCK_NUMBER = config_data.SNAPSHOT_BLOCK_NUMBER;
const MAX_RES = 1000;
const ZERO_NUM = 0;

const queryStakes = `query getSnapshot($skip: Int!) {
    stakes(first: 1000, skip: $skip, where: {tokenSymbol: "OM"}) {
        id
        address
        stakedAmount
        mintedAmount
        blockNumber
        tokenSymbol
    }
}`;

const queryUnstake = `query getSnapshot($skip: Int!) {
    unstakes(first: 1000, skip: $skip, where: { tokenSymbol: "OM" }) {
        id
        address
        unstakedAmount
        burnedAmount
        blockNumber
        tokenSymbol
    }
}`;

const queryClaims = `query getSnapshot($skip: Int!) {
    claims(first: 1000, skip: $skip, where: { tokenSymbol: "OM" }) {
        id
        address
        requestedAmount
        claimedAmount
        feeAmount
        burnedAmount
        blockNumber
    }
}`;

const queryPrices = `query getSnapshot($skip: Int!) {
    priceUpdates(first: 1000, skip: $skip, where: { tokenSymbol: "OM" }) {
        id
        mantissa
        base
        exponentiation
        blockNumber
        tokenSymbol
    }
}`;

const get_stakes = async() => {
    let response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/mantradao/polygon-staking-subgraph-legacy',
        {
            query: queryStakes,
            variables: {
                first: MAX_RES,
                skip: _offset_stake
            }
        }, {
            headers: {
                'Content-type': 'application/json'
            }
        }
    );

    // push eligible stakes
    for (let i = 0; i < response.data.data.stakes.length; i++) {
        if (response.data.data.stakes[i].blockNumber <= BLOCK_NUMBER) {
            stakes.push(response.data.data.stakes[i]);
        }
    }

    // has next page - get next page
    if (response.data.data.stakes.length >= MAX_RES) {
        _offset_stake = _offset_stake + MAX_RES;
        await get_stakes();
    } else {
        cleanedStakes = stakes.reduce((accumulator, cur) => {
            let addr = cur.address;
            let found = accumulator.find(elem => elem.address === addr);
            if (found) found.mintedAmount = BigInt(found.mintedAmount) + BigInt(cur.mintedAmount);
            else accumulator.push(cur);
            return accumulator;
        }, []);
    }

    return cleanedStakes;
}

const get_unstakes = async() => {
    let response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/mantradao/polygon-staking-subgraph-legacy',
        {
            query: queryUnstake,
            variables: {
                first: MAX_RES,
                skip: _offset_unstake
            }
        }, {
            headers: {
                'Content-type': 'application/json'
            }
        }
    );

    // push eligible unstakes
    for (let i = 0; i < response.data.data.unstakes.length; i++) {
        if (response.data.data.unstakes[i].blockNumber <= BLOCK_NUMBER) {
            unstakes.push(response.data.data.unstakes[i]);
        }
    }

    if (response.data.data.unstakes.length >= MAX_RES) {
        _offset_unstake = _offset_unstake + MAX_RES;
        await get_unstakes();
    } else {
        cleanedUnstakes = unstakes.reduce((accumulator, cur) => {
            let addr = cur.address;
            let found = accumulator.find(elem => elem.address === addr);
            if (found) found.burnedAmount = BigInt(found.burnedAmount) + BigInt(cur.burnedAmount);
            else accumulator.push(cur);
            return accumulator;
        }, []);
    }

    return cleanedUnstakes;
}

const get_claims = async() => {
    let response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/mantradao/polygon-staking-subgraph-legacy',
        {
            query: queryClaims,
            variables: {
                first: MAX_RES,
                skip: _offset_claim
            }
        }, {
            headers: {
                'Content-type': 'application/json'
            }
        }
    );

    // push eligible stakes
    for (let i = 0; i < response.data.data.claims.length; i++) {
        if (response.data.data.claims[i].blockNumber <= BLOCK_NUMBER) {
            claims.push(response.data.data.claims[i]);
        }
    }

    // has next page - get next page
    if (response.data.data.claims.length >= MAX_RES) {
        _offset_claim = _offset_claim + MAX_RES;
        await get_claims();
    } else {
        cleanedClaims = claims.reduce((accumulator, cur) => {
            let addr = cur.address;
            let found = accumulator.find(elem => elem.address === addr);
            if (found) found.burnedAmount = BigInt(found.burnedAmount) + BigInt(cur.burnedAmount);
            else accumulator.push(cur);
            return accumulator;
        }, []);
    }

    return cleanedClaims;
}

const get_prices = async() => {
    let response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/mantradao/polygon-staking-subgraph-legacy',
        {
            query: queryPrices,
            variables: {
                first: MAX_RES,
                skip: _offset_price
            }
        }, {
            headers: {
                'Content-type': 'application/json'
            }
        }
    );

    // push eligible stakes
    for (let i = 0; i < response.data.data.priceUpdates.length; i++) {
        if (response.data.data.priceUpdates[i].blockNumber <= BLOCK_NUMBER) {
            priceUpdates.push(response.data.data.priceUpdates[i]);
        }
    }

    // has next page - get next page
    if (response.data.data.priceUpdates.length >= MAX_RES) {
        _offset_price = _offset_price + MAX_RES;
        await get_prices();
    }

    return priceUpdates;
}

(async () => {
    await get_stakes();
    await get_unstakes();
    await get_prices();
    await get_claims();

    cleanedStakes.forEach((element) => {
        if (cleanedUnstakes.find(e => e.address === element.address)) {
            snapshot.push({
                address: element.address,
                stakedBalance: (BigInt(element.mintedAmount) - BigInt(cleanedUnstakes.find(e => e.address === element.address).burnedAmount))
            });
        }
        else {
            snapshot.push({
                address: element.address,
                stakedBalance: BigInt(element.mintedAmount)
            });
        }
    });

    snapshot.forEach(((element) => {
        if (cleanedClaims.find(e => e.address === element.address)) {
            element.stakedBalance = BigInt(element.stakedBalance) - BigInt(cleanedClaims.find(e => e.address === element.address).burnedAmount)
        }
    }))

    priceUpdates.sort((a,b) => (a.blockNumber > b.blockNumber) ? -1 : ((b.blockNumber > a.blockNumber) ? 1 : 0));

    snapshot.forEach((snap) => {
        if (snap.stakedBalance <= ZERO_NUM) {
            snap.stakedBalance = ZERO_NUM;
        } else {
            snap.stakedBalance = BigInt(BigNumber(snap.stakedBalance) * BigNumber(BigNumber(priceUpdates[0].mantissa) * BigNumber(0.1 ** 18)));
        }
    });

    snapshot.sort((a,b) => (a.stakedBalance > b.stakedBalance) ? -1 : ((b.stakedBalance > a.stakedBalance) ? 1 : 0));

    const csv = new ObjectsToCsv(snapshot);
    await csv.toDisk('./output/legacy-snapshot-data/bsc-polygon-snapshots/polygon_som.csv');
})()
