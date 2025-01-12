require('dotenv').config()
const { WaxAction } = require('./wax-action')
const csv = require('csv-parser');
const fs = require('fs');
const { finished } = require('stream/promises');

const FILE_NAME = 'withdraw_requests.csv';

let readCSV = async (fileName) => {
    const stakingList = [];
    let stream = fs
        .createReadStream(`./${fileName}`)
        .pipe(csv())
        .on('data', (data) => stakingList.push(data))
        .on('end', () => { });
    await finished(stream);
    return stakingList;
};

// required params
if (!process.env.NODEOS_ENDPOINT) throw new Error("NODEOS_ENDPOINT is required");
if (!process.env.CHAIN_ID) throw new Error("CHAIN_ID is required");
if (!process.env.ACCOUNT) throw new Error("ACCOUNT is required");
if (!process.env.PERMISSION) throw new Error("PERMISSION is required");
if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

const config = {
    endpoint: process.env.NODEOS_ENDPOINT,
    chainId: process.env.CHAIN_ID,
    account: process.env.ACCOUNT,
    permission: process.env.PERMISSION,
    privateKey: process.env.PRIVATE_KEY,
};

const waxAction = new WaxAction(config)

async function transferWithdrawRequests() {
    try {
        const withdrawList = await readCSV(FILE_NAME);
        for (const withdraw of withdrawList) {
            console.log("*****************************************************");
            console.log("Withdraw request: ", withdraw);
            // check account is exist or not
            await waxAction.getAccount(withdraw.to_account);
            const quantity = parseFloat(withdraw.amount_in_wax).toFixed(8) + ' WAX'; // wax has 8 decimals
            const receipt = await waxAction.transferWax(config.account, withdraw.to_account, quantity, withdraw.memo );
            console.info('Withdraw is done at transaction_id: ' + receipt.transaction_id);
        }

    } catch (error) {
        console.log(error.message);
    }
}

transferWithdrawRequests()