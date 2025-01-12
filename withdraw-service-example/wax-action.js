const eosjs = require('eosjs')
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig') // development only
const fetch = require('node-fetch')
const { TextDecoder, TextEncoder } = require('util') // node only

/* eslint-disable */
class WaxAction {
  constructor(config) {
    this.config = config
    const rpc = new eosjs.JsonRpc(config.endpoint, { fetch: config.fetch || fetch })
    this.rpc = rpc
    const defaultPrivateKey = config.privateKey
    const signatureProvider = new JsSignatureProvider([defaultPrivateKey])
    this.wax = new eosjs.Api({ chainId: config.chainId, rpc, signatureProvider, textEncoder: new TextEncoder(), textDecoder: new TextDecoder() })

  }

  async transferWax(from, to, quantity, memo) {
    return await this.pushAction(
      'eosio.token',
      'transfer',
      this.config.account,
      { from, to, quantity, memo },
      this.config.permission
    );
  }

  async pushAction(account, action, actor, data, permission = 'active') {
    const actionParams = {
      actions: [{
        account,
        name: action,
        authorization: [{
          actor,
          permission
        }],
        data
      }]
    }
    return await this.wax.transact(
      actionParams,
      {
        blocksBehind: 3,
        expireSeconds: 30
      })
  }

  async getInfo() {
    return await this.wax.rpc.get_info({})
  }
  async getAccount(accountName) {
    return await this.wax.rpc.get_account(accountName)
  }

  async fetchTable(account, scope, table, lower_bound, upper_bound, limit, index = "1", key_type = "i64", reverse = "true") {
    return await fetch(this.config.endpoint + `/v1/chain/get_table_rows`, {
      method: 'POST',
      body: JSON.stringify({
        code: account,
        scope: scope,
        table: table,
        lower_bound: lower_bound,
        upper_bound: upper_bound,
        index_position: index,
        key_type: key_type,
        reverse: reverse,
        json: "true",
        limit: limit,
      }),
    });
  }
}

module.exports = {
  WaxAction
}