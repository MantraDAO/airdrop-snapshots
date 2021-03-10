const BN = require('bignumber.js')

const data = require('./output/legacy-snapshot-data/som/12009597.json')

const total = Object.values(data.balances).reduce((total, one) => total.plus(one), new BN(0));
console.log(data.totalSupply, 'total supply')
console.log(total.toString(), 'total');
