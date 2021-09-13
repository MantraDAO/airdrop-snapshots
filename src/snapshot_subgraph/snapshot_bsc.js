const config_data = require('../../config/default.json');
const ObjectsToCsv = require('objects-to-csv');

const axios = require('axios');

let _offset_stake = 0;
let _offset_unstake = 0;
let _offset_price = 0;

let stakes = [];
let unstakes = [];
let latestPrice = [];

let cleanedStakes = [];
let cleanedUnstakes = [];
let snapshot = [];


const BLOCK_NUMBER = config_data.SNAPSHOT_BLOCK_NUMBER;
const MAX_RES = 1000;
const ZERO_NUM = 0;

const queryStakes = `query getSnapshot($skip: Int!) {
    stakes(first: 1000, skip: $skip, where: {token: "om"}) {
        id
        address
        stakedAmount
        blockNumber
        token
    }
}`;

const queryUnstake = `query getSnapshot($skip: Int!) {
    unstakes(first: 1000, skip: $skip, where: { token: "om" }) {
        id
        address
        unstakedAmount
        blockNumber
        token
    }
}`;

const queryPrice = `query getSnapshot($skip: Int!) {
    priceUpdates(first: 1000, skip: $skip) {
        id
        mantissa
        blockNumber
        token
    }
}`;

const get_stakes = async() => {
    let response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/spaceforce-dev/staking-legacy',
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
            if (found) found.stakedAmount = BigInt(found.stakedAmount) + BigInt(cur.stakedAmount);
            else accumulator.push(cur);
            return accumulator;
        }, []);
    }
    
    return cleanedStakes;
}

const get_unstakes = async() => {
    let response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/spaceforce-dev/staking-legacy',
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
            if (found) found.unstakedAmount = BigInt(found.unstakedAmount) + BigInt(cur.unstakedAmount);
            else accumulator.push(cur);
            return accumulator;
        }, []);
    }

    return cleanedUnstakes;
}

const get_latest_price = async () => {
    let response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/spaceforce-dev/staking-legacy',
        {
            query: queryPrice,
            variables: {
                skip: _offset_price
            }
        }, { 
            headers: {
                'Content-type': 'application/json'
            }
        } 
    );

    for (let i = 0; i < response.data.data.priceUpdates.length; i++) {
        if (response.data.data.priceUpdates[i].blockNumber <= BLOCK_NUMBER) {
            latestPrice.push(response.data.data.priceUpdates[i]);
        }
    }

    if (response.data.data.priceUpdates.length >= MAX_RES) {
        _offset_price = _offset_price + MAX_RES;
        await get_latest_price();
    }

    return latestPrice;
}

(async () => {
    await get_stakes();
    await get_unstakes();
    await get_latest_price();

    cleanedStakes.forEach(function(element) {
        if (cleanedUnstakes.find(e => e.address === element.address)) {
            snapshot.push({
                address: element.address,
                stakedBalance: (BigInt(element.stakedAmount) - BigInt(cleanedUnstakes.find(e => e.address === element.address).unstakedAmount))
            });
        } else {
            snapshot.push({
                address: element.address,
                stakedBalance: BigInt(element.stakedAmount)
            });
        }
    });

    snapshot.forEach((snap) => {
        if (snap.stakedBalance <= ZERO_NUM) {
            snap.stakedBalance = ZERO_NUM;
        }
    });

    snapshot.sort((a,b) => (a.stakedBalance > b.stakedBalance) ? -1 : ((b.stakedBalance > a.stakedBalance) ? 1 : 0));
    latestPrice.sort((a,b) => (a.blockNumber > b.blockNumber) ? -1 : ((b.blockNumber > a.blockNumber) ? 1 : 0));

    snapshot.unshift({
        address: 'latestPrice: ' + latestPrice[0].mantissa,
        stakedBalance: ''
    });
    
    const csv = new ObjectsToCsv(snapshot);
    await csv.toDisk('./output/legacy-snapshot-data/bsc-polygon-snapshots/bsc_snapshot.csv');
})()