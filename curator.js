const steem = require('steem');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const url = 'mongodb://localhost:27017/curation';

    
async function curate(){
  debug(`Starting the curation bot`);
  const client = await new MongoClient(
    url,
    {useNewUrlParser: true,useUnifiedTopology: true}
  ).connect().catch(err => { console.log(err); });

  const db = client.db('curation');
  const collection = db.collection('stats');

  let account = await steem.api.getAccountsAsync(['raserrano']);
  // Get account info like voting power and vote vests
  let vp = getVotingPower(account[0]);
  let total_vests = await getSteemPower(account[0]);
  debug(`VP is: ${vp}`);
  debug(`Vests is: ${total_vests}`);

  steem.api.streamTransactions('head',async (err, transactions)=>{
    if (transactions.operations["0"]["0"] === 'comment') {
      let author= transactions.operations["0"]["1"].author;
      let permlink = transactions.operations["0"]["1"].permlink;
      let record = {'author': author,'permlink': permlink}
      let content = await steem.api.getContentAsync(author, permlink);
      record.payout = content.pending_payout_value;
      record.created = content.created;
      record.votes = content.active_votes;
      let total_rshares = 0;
      let flags = [];
      for (let i = 0; i < content.active_votes.length; i++){
        let rshares_vote = parseInt(content.active_votes[i].rshares);
        if(rshares_vote > 0){
          total_rshares += rshares_vote;
        }else{
          flags.push(content.active_votes[i].voter);
        }
      }
      //console.log(total_rshares,flags,content.active_votes);

      debug(`Analyzing post ${author}/${permlink}`)
      debug(`Votes ${content.active_votes.length}`)
      if(flags.length > 0){
        debug(`Flags ${flags}`)
      }
      debug(`Rshares ${total_rshares}`)
      // Research time differences
      // debug(`Post age ${content.created}`)
      // debug(`Time now ${new Date()}`)
      // debug(`Post diff ${dateDiff(content.created)}`)

      debug(`My share if I vote: ${(total_vests/(total_vests+total_rshares))}`)

      let stats = await collection.findOne({'author': author});

      // return client.db('curation').collection('stats').insertOne(record, (err) => {
      //   if(err) throw err;
      //   debug('Inserted!')
      // });
      // return client.close();
      // If not found in DB
      if(stats === null){
        console.log(`Looking for past posts to generate the curation rank`)
        let average_payout, average_votes;

        steem.api.getDiscussionsByBlog(
          {tag: author, limit: 10},
          function(err, result) {
            if (err) {
              console.log(err);
            }
            //console.log(result);
            // for(let i=0; i<result.length; i++){
            //   console.log(`Author: ${result[i].author} Permlink: ${result[i].permlink} Created: ${result[i].created} Pending: ${result[i].pending_payout_value} Total: ${result[i].total_payout_value} Votes: ${result[i].active_votes.length}`)
            //   // calculate average 

            //   console.log(JSON.stringify(result[i].active_votes[0]));
            //   for(let j=0; j < result[i].active_votes.length; j++){
            //     console.log(`Rshares: ${result[i].active_votes[j].rshares} Voter: ${result[i].active_votes[j].voter}`)
            //   }
            // }
            sum = result.reduce((sum, res) => sum + parseFloat(res.pending_payout_value.split(' ')[0]) + parseFloat(res.total_payout_value.split(' ')[0]),0 );
            votes = result.reduce((votes_count, res) => votes_count + parseFloat(res.active_votes.length),0 );
            average_payout = sum/result.length;
            average_votes = votes/result.length;
            console.log(`AVG: ${average_payout}`);
            console.log(`Votes avg: ${average_votes}`);
            return client.db('curation').collection('stats').insertOne(record, (err) => {
              if(err) throw err;
              debug('Inserted!')
            });
          }
        );        
      }else{
        // get previous calculated efficiency stats
        console.log(`Found it in the DB`)

      }
      // let stats;
      // client.db('curation').collection('stats').find({'author': author}).toArray((err, result) => {
      //   if (err) throw err
      //   stats = result;
      // });
      // debug(stats);
      // Verify if user is in DB
        // Get stats 
      // else 

        // Get the total Rshares of votes
        // Get a list of order rshares
        // Get the time difference


        // Get last 10 posts of the author
        // calculate the average payout amount
        // calculate when big votes are received per post
        // Obtain the minimum wait time to vote before big voters

        // Calculate efficiency voting now
        // Calculate efficiency voting after X minutes

        // Save stats in DB


      // perform vote






      // return client.db('curation').collection('stats').insertOne(record, (err) => {
      //   if(err) throw err;
      //   debug('Inserted!')
      // });
      // return client.close();
    }

  });
}


  async function getSteemPower(account) {
    let globalData = steem.api.getDynamicGlobalPropertiesAsync();
    var vp = account.voting_power;
    var vestingSharesParts = account.vesting_shares.split(' ');
    var receivedSharesParts = account.received_vesting_shares.split(' ');
    var delegatedSharesParts = account.delegated_vesting_shares.split(' ');
    return (parseFloat(vestingSharesParts[0]) + parseFloat(receivedSharesParts[0])) - parseFloat(delegatedSharesParts[0]);
    // debug('Total vests: ' + totalVests);
    //return this.getSteemPowerFromVest(globalData,totalVests);
  }
  function calculateVoteWeight(account, vp, target_value) {
    var globalData = wait.for(
      this.steem_getSteemGlobaleProperties_wrapper
    );
    var ci = this.init_conversion(globalData);
    var steempower = this.getSteemPower(account);
    var sp_scaled_vests = steempower / ci.steem_per_vest;
    var f = target_value / (sp_scaled_vests * 100 * ci.reward_pool * ci.sbd_per_steem);
    var votingpower = parseInt((((f * 50) - 49) / vp) * 10000);
    if (votingpower > 10000) {
      votingpower = 10000;
    }
    return votingpower;
  }
  async function init_conversion(globalData, callback) {
    var ci = new Object();
    // Get some info first
    var headBlock = await steem_getBlockHeader_wrapper(globalData.head_block_number);

    latestBlockMoment = new Date(headBlock.timestamp);
    ci.rewardfund_info = await steem_getRewardFund_wrapper('post');

    ci.price_info = await steem_getCurrentMedianHistoryPrice_wrapper();
    ci.reward_balance = ci.rewardfund_info.reward_balance;
    ci.recent_claims = ci.rewardfund_info.recent_claims;
    ci.reward_pool = ci.reward_balance.replace(' STEEM', '')
      / ci.recent_claims;

    ci.sbd_per_steem = ci.price_info.base.replace(' SBD', '')
      / ci.price_info.quote.replace(' STEEM', '');

    ci.steem_per_vest =
      globalData.total_vesting_fund_steem.replace(' STEEM', '')
      / globalData.total_vesting_shares.replace(' VESTS', '');
    ci.steem_to_dollar = await request('https://api.coinmarketcap.com/v1/ticker/steem/');
    ci.steem_to_dollar = JSON.parse(ci.steem_to_dollar.body)[0].price_usd;
    ci.sbd_to_dollar = await request('https://api.coinmarketcap.com/v1/ticker/steem-dollars/');
    ci.sbd_to_dollar = JSON.parse(ci.sbd_to_dollar.body)[0].price_usd;
    return ci;
  }
  function getSteemPowerFromVest(globalData, vest) {
    try {
      return steem.formatter.vestToSteem(
        vest,
        parseFloat(globalData.total_vesting_shares),
        parseFloat(globalData.total_vesting_fund_steem)
      );
    } catch (err) {
      return 0;
    }
  }
  function steem_getCurrentMedianHistoryPrice_wrapper(callback) {
    steem.api.getCurrentMedianHistoryPrice(function(err, result) {
      callback(err, result);
    });
  }
  function steem_getBlockHeader_wrapper(blockNum, callback) {
    steem.api.getBlockHeader(blockNum, function(err, result) {
      callback(err, result);
    });
  }
  function steem_getRewardFund_wrapper(type, callback) {
    steem.api.getRewardFund(type, function(err, data) {
      callback(err, data);
    });
  }

  function getVotingPower(account) {
    var vp = account.voting_power;
    debug('Last voted time : ' + account.last_vote_time);
    var secondsDiff = dateDiff(account.last_vote_time);
    debug('Seconds difference ' + secondsDiff);
    if (secondsDiff > 0) {
      var vpRegenerated = secondsDiff * 10000 / 86400 / 5;
      debug('Regenerated ' + vpRegenerated);
      vp += vpRegenerated;
    }
    if (vp > 10000) {
      vp = 10000;
    }
    debug('VP is: ' + vp);
    return vp;
  }
  function getReputation(account) {
    var rep = account.reputation;
    var multi = (rep < 0)?-9:9;
    rep = Math.log10(Math.abs(rep));
    rep = Math.max(rep - 9, 0);
    rep *= multi;
    rep += 25;
    return rep.toFixed(3);
  }
  function debug(message) {
    if (JSON.parse(process.env.DEBUG) === true) {
      console.log(message);
    }
  }
  function dateDiff(when, now=new Date()) {
    var then = new Date(when);
    return (then - now) / 1000;
  }
curate();