const config_data = require('../../config/default.json');
const ObjectsToCsv = require('objects-to-csv');

const axios = require('axios');

let _offset_stake = 0;
let _offset_unstake = 0;
let _offset_claim = 0;

let stakes = [];
let unstakes = [];

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

const get_stakes = async() => {
    let response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/mantradao/bsc-staking-subgraph-legacy',
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
        'https://api.thegraph.com/subgraphs/name/mantradao/bsc-staking-subgraph-legacy',
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
        'https://api.thegraph.com/subgraphs/name/mantradao/bsc-staking-subgraph-legacy',
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

(async () => {
    await get_stakes();
    await get_unstakes();
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

    snapshot.forEach((snap) => {
        if (snap.stakedBalance <= ZERO_NUM) {
            snap.stakedBalance = ZERO_NUM;
        }
    });

    snapshot.sort((a,b) => (a.stakedBalance > b.stakedBalance) ? -1 : ((b.stakedBalance > a.stakedBalance) ? 1 : 0));

    const csv = new ObjectsToCsv(snapshot);
    await csv.toDisk('./output/legacy-snapshot-data/bsc-polygon-snapshots/bsc_som.csv');
})()
