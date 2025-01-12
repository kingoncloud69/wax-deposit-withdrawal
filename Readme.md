# WAX Node Deposit/Withdrawal System Example
This repository provides an example solution for cryptocurrency exchanges to handle WAX token deposits and withdrawals.

## System Architecture Overview
The system consists of three main components:

1. WAX Node with SHIP plugin
2. Deposit Monitoring Service
3. Withdrawal Processing Service
### Why This Architecture?
1. Deposit Monitoring:

- Uses SHIP (State-History) plugin for real-time, reliable transaction monitoring
- No missed transactions due to direct blockchain data access
- Ability to replay transactions from any point in history
- Better reliability compared to polling API endpoints

Example Deposit Flow:
```bash
User (useruser1234) ──transfer──> Exchange Account (dexaccount11)
                                        │
                                        │ SHIP plugin monitors
                                        │ all transfers
                                        ▼
                                  Deposit Service
                                        │
                                        │ Process deposit based
                                        │ on your business logic
                                        ▼
                                Exchange System
```

2. Withdrawal Management:
- Separate hot wallet with limited permissions
- Batch processing capability

Example Withdrawal Flow:
```bash
Exchange System ──Database──> Withdrawal Service
                              │
                              │ Process withdrawals
                              │ using hot wallet
                              ▼
   User (useruser1234) <──transfer─── Hot Wallet (cexwithdraw1@hotwallet)
```

## Components Setup
### WAX Node Setup
1. Prerequisites

- Ubuntu 20.04 or higher
- Minimum Hardware Requirements:
  - CPU: 8 cores
  - RAM: 32GB
  - Storage: 500GB NVMe SSD
2. Installation
- Install necessary packages:
```bash
sudo apt update
sudo apt install -y wget zstd tar
```

- Download and install WAX Leap
```bash
# Download wax-leap
wget https://github.com/worldwide-asset-exchange/wax-blockchain/releases/download/v5.0.3wax01/wax-leap_5.0.3wax01_amd64.deb
# Install wax-leap
sudo apt install ./wax-leap_5.0.3wax01_amd64.deb
# Verify full version of cleos
cleos version full
```

3. Start Node
- Clone WAX node repository:
```bash
git clone https://github.com/worldwide-asset-exchange/wax-node.git
cd wax-node
# If you want to run a testnet node,
git checkout testnet
```
This command:
-s true: Start from snapshot
-e true: Enable SHIP node

- Starting the Node
```bash
./start.sh -s true -e true
```
- Verify SHIP availability:
```bash
docker ps
CONTAINER ID   IMAGE                         PORTS                                            NAMES
b83af4851b3e   waxteam/waxnode:v5.0.3wax02  0.0.0.0:8080->8080/tcp, 0.0.0.0:8888->8888/tcp  nodeos
# HTTP API: 8888
# SHIP: 8080
# P2P: 9876
```

- Monitor node startup
```bash
# Check logs
tail -f wax-mainnet/nodeos.log  # or wax-testnet/nodeos.log

# Check node status
curl http://localhost:8888/v1/chain/get_info
{
  "server_version": "b18375f7",
  "chain_id": "f16b1833c747c43682f4386fca9cbb327929334a762755ebec17f6f23c9b8a12",
  "head_block_num": 321492827,
  ...
}
# stop node
./stop.sh

# Reset node
./reset.sh
```
- Common Issues:
```bash
# Disk Space
df -h
# Memory Issues
free -h
# Adjust chain-state-db-size-mb in config.ini
```
* More detail, Please check out the [wax-node](https://github.com/worldwide-asset-exchange/wax-node) project
### Setting Up Local Wallet

1. Create a local wallet:
```bash
# Create a new wallet
cleos wallet create --to-console
# Response will look like:
# Creating wallet: default
# Save password to use in the future to unlock this wallet.
# Without password imported keys will not be retrievable.
# "PW5..."

# Unlock your wallet
cleos wallet unlock
```
2. Common Wallet Operations
```bash
# Transfer WAX:
cleos -u http://localhost:8888 transfer fromaccount toaccount "1.00000000 WAX" "memo" -p fromaccount
# Get account info:
cleos -u http://localhost:8888 get account accountname
# Check balance:
cleos -u http://localhost:8888 get currency balance eosio.token accountname WAX
```
More commands [here](https://developer.wax.io/build/dapp-development/setup-local-dapp-environment/dapp_wallet.html)

## WAX Deposit Service
A service to monitor and process WAX token deposits from the blockchain using the State-History (SHIP) plugin.

1. Installation
```bash
cd deposit-service-example

# Install dependencies
npm install
```
2. Set environment variables:
```bash
# Required
export SOCKET_ADDRESS=ws://localhost:8080    # SHIP websocket endpoint
export EOS_ENDPOINT=http://localhost:8888    # WAX node API endpoint
export DEBUG_STATE_RECEIVER=1 # Optional
```
3. Update code settings:
- Find following code and update folloing envirements:

```bash
# Set start block
startBlock: 321492827,
...
# Configure actions to monitor
deserializerActions: [
  'eosio.token::transfer',
],
...
# Customize transfer handling
if (contractName === 'eosio.token' && actionName === 'transfer') {
  console.log(
    `${block_num} ${contractName}::${actionName} ${act.data.from} -> ${act.data.to} ${act.data.quantity}`
  );
};
  } 
```

4. Start service:
```bash
node deposit-listener.js
```

5. Monitor the output:
```bash
Starting deposit listener...
Received 5.5 B/s; Queue size: 2
New block 321492944
Block time 2025-01-12T01:57:59.000
321492944 eosio.token::transfer useruser1234 -> dexaccount11 1.23000000 WAX memo: 123456
```
* You can double check in explorere at [here](https://testnet.waxblock.io/transaction/32c58cbaef3eaa37b2b9c23b3e952370ca2609422e9d6a5abcc2ec9e58bb89b0)

## WAX Withdraw service
The withdrawal service processes withdrawal requests from user and executes WAX token transfers on the blockchain.
### Installation
1. Installation
```bash
cd withdraw-service-example
npm install
cp sample.env .env
```
2. Configure environment variables:
```bash
# Required WAX node endpoint (testnet or mainnet)
NODEOS_ENDPOINT=http://localhost:8888

# Chain ID (testnet or mainnet)
CHAIN_ID=f16b1833c747c43682f4386fca9cbb327929334a762755ebec17f6f23c9b8a12

# Withdrawal account configuration
ACCOUNT=cexwithdraw1        # Your withdrawal account
PERMISSION=hotwallet        # Permission level to use
PRIVATE_KEY=5KWXcFVL...    # Private key for the account
```

3. Setup Hot wallet
```bash
# Generate new key pair
cleos create key --to-console
# Output:
# Private key: 5KWXcFVLLe6741epQuRLYytpSmYabAiJcyTjU54xcW48jwwWcsi
# Public key: EOS6P1mJDsczuGDfv6FrVx2uSzCKo5q5qHB2yAUHu2sxVGV1h9bE9

# Create hotwallet permission
cleos -u http://localhost:8888 push action eosio updateauth '[
    "cexwithdraw1",
    "hotwallet",
    "active",
    {
        "threshold": 1,
        "keys": [{
            "key": "EOS6P1mJDsczuGDfv6FrVx2uSzCKo5q5qHB2yAUHu2sxVGV1h9bE9",
            "weight": 1
        }],
        "waits": [],
        "accounts": []
    }
]' -p cexwithdraw1

# Link permission to transfer action
cleos -u http://localhost:8888 push action eosio linkauth '[
    "cexwithdraw1",
    "eosio.token",
    "transfer",
    "hotwallet"
]' -p cexwithdraw1

# Verify permission setup
cleos -u http://localhost:8888 get account cexwithdraw1
created: 2025-01-12T04:14:29.000
permissions: 
     owner     1:    1 EOS8aRLDkkJQTjauCCPmUZTi3pNszqBRrieD8QsVP2w8zUpqgQj7m
        active     1:    1 EOS7nXBeDCQVEZg5U8F729HJMSwYsXYfSuAEZPL8ofzHxN6TgWJCx
           hotwallet     1:    1 EOS6P1mJDsczuGDfv6FrVx2uSzCKo5q5qHB2yAUHu2sxVGV1h9bE9

permission links: 
     hotwallet:
          eosio.token::transfer
```

4. Start Service
```bash
$ npm start

> withdraw-service-example@1.0.0 start
> node withdraw-service.js

*****************************************************
Withdraw request:  {
  id: '1',
  to_account: 'useruser1234',
  amount_in_wax: '12.345',
  memo: 'test123'
}
Withdraw is done at transaction_id: 986fb6d4aa4122a5df87a892b012aa4fac4cab5457f6e0fb2a9591503db0359d
*****************************************************
Withdraw request:  {
  id: '2',
  to_account: 'useruser1234',
  amount_in_wax: '0.123',
  memo: '121212'
}
Withdraw is done at transaction_id: 5980fb68fca9e764cc73d974efe737ae165904eb4669c6879201e00d5aba9ea6
*****************************************************
Withdraw request:  { id: '3', to_account: 'eosio', amount_in_wax: '12', memo: '' }
Withdraw is done at transaction_id: 91262209fdeace7180b06c35ab8e9bd29265dbccd88cb7411e4dd5bc715fd1cd
```