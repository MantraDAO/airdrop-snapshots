const config_data = require('../../config/default.json');
const BN = require('bignumber.js');
const ObjectsToCsv = require('objects-to-csv');
const axios = require('axios');

const BLOCK_NUMBER = config_data.SNAPSHOT_BLOCK_NUMBER;
const ZERO_NUM = 0;
const MAX_RES = 1000;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

let lastID = "";
let transfers = [];
let cleanedFrom = [];
let cleanedTo = [];
let snapshot = [];

const queryTransfers = `query getSnapshot($lastID: String!) {
    transfers(first: 1000, where: {id_gt: $lastID}) {
        id
        from
        to
        value
        blockNumber
    }
}`;

const get_transfers = async() => {
    let response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/tomtsaomantra/polygon-om-token-subgraph',
        {
            query: queryTransfers,
            variables: {
                first: MAX_RES,
                lastID: lastID
            }
        }, {
            headers: {
                'Content-type': 'application/json'
            }
        }
    );

    // push eligible transfers
    for (let i = 0; i < response.data.data.transfers.length; i++) {
        if (response.data.data.transfers[i].blockNumber <= BLOCK_NUMBER) {
            transfers.push(response.data.data.transfers[i]);
        }
    }

    // has next page - get next page
    if (response.data.data.transfers.length >= MAX_RES) {
        lastID = response.data.data.transfers[response.data.data.transfers.length - 1].id;
        await get_transfers();
    } else {
        let transfersFrom = [...transfers];
        let tranfersTo = [...transfers];

        transfersFrom = transfersFrom.map(({to, ...keepAttrs}) => keepAttrs);      
        tranfersTo = tranfersTo.map(({from, ...keepAttrs}) => keepAttrs);
 
        cleanedFrom = transfersFrom.reduce((accumulator, cur) => {
            let from = cur.from;
            let found = accumulator.find(elem => elem.from === from);
            if (found) found.value = BigInt(found.value) + BigInt(cur.value);
            else accumulator.push(cur);
            return accumulator;
        }, []);

        cleanedTo = tranfersTo.reduce((accumulator, cur) => {
            let to = cur.to;
            let found = accumulator.find(elem => elem.to === to);
            if (found) found.value = BigInt(found.value) + BigInt(cur.value);
            else accumulator.push(cur);
            return accumulator;
        }, []);

        console.log(transfers.length);
    }

    return transfers;
}

(async () => {
    await get_transfers();

    cleanedTo.forEach(function(element) {
        if (cleanedFrom.find(e => e.from === element.to)) {
            snapshot.push({
                address: element.to,
                balance: (BigInt(element.value) - BigInt(cleanedFrom.find(e => e.from === element.to).value))
            });
        } else {
            snapshot.push({
                address: element.to,
                balance: BigInt(element.value)
            });
        }
    });

    snapshot.forEach((snap) => {
        if (snap.balance <= ZERO_NUM) {
            snap.balance = ZERO_NUM;
        }
    });

    snapshot.sort((a,b) => (a.balance > b.balance) ? -1 : ((b.balance > a.balance) ? 1 : 0));

    const csv = new ObjectsToCsv(snapshot);
    await csv.toDisk('./output/legacy-snapshot-data/bsc-polygon-snapshots/polygon_om.csv');
})()


