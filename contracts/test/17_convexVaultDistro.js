const { BN, constants, expectEvent, expectRevert, time } = require('openzeppelin-test-helpers');
var jsonfile = require('jsonfile');
var contractList = jsonfile.readFileSync('./contracts.json');

const Booster = artifacts.require("Booster");
const FxsDepositor = artifacts.require("FxsDepositor");
const FraxVoterProxy = artifacts.require("FraxVoterProxy");
const cvxFxsToken = artifacts.require("cvxFxsToken");
const IFeeDistro = artifacts.require("IFeeDistro");
const TestPool_Erc20 = artifacts.require("TestPool_Erc20");
const StakingProxyERC20 = artifacts.require("StakingProxyERC20");
const StakingProxyConvex = artifacts.require("StakingProxyConvex");
const IFraxFarmERC20_V2 = artifacts.require("IFraxFarmERC20_V2");
const PoolRegistry = artifacts.require("PoolRegistry");
const FeeRegistry = artifacts.require("FeeRegistry");
const MultiRewards = artifacts.require("MultiRewards");
const PoolUtilities = artifacts.require("PoolUtilities");
const IConvexWrapperV2 = artifacts.require("IConvexWrapperV2");
const ICvxLocker = artifacts.require("ICvxLocker");
const FeeDeposit = artifacts.require("FeeDeposit");
const GaugeExtraRewardDistributor = artifacts.require("GaugeExtraRewardDistributor");

const IVPool = artifacts.require("IVPool");
const IExchange = artifacts.require("IExchange");
const IERC20 = artifacts.require("IERC20");

const IFraxGaugeController = artifacts.require("IFraxGaugeController");
const IFraxRewardDistributor = artifacts.require("IFraxRewardDistributor");

const ICurveConvex = artifacts.require("ICurveConvex");


// const unlockAccount = async (address) => {
//   return new Promise((resolve, reject) => {
//     web3.currentProvider.send(
//       {
//         jsonrpc: "2.0",
//         method: "evm_unlockUnknownAccount",
//         params: [address],
//         id: new Date().getTime(),
//       },
//       (err, result) => {
//         if (err) {
//           return reject(err);
//         }
//         return resolve(result);
//       }
//     );
//   });
// };

const addAccount = async (address) => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_addAccount",
        params: [address, "passphrase"],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      }
    );
  });
};

const unlockAccount = async (address) => {
  await addAccount(address);
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "personal_unlockAccount",
        params: [address, "passphrase"],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      }
    );
  });
};

const send = payload => {
  if (!payload.jsonrpc) payload.jsonrpc = '2.0';
  if (!payload.id) payload.id = new Date().getTime();

  return new Promise((resolve, reject) => {
    web3.currentProvider.send(payload, (error, result) => {
      if (error) return reject(error);

      return resolve(result);
    });
  });
};

/**
 *  Mines a single block in Ganache (evm_mine is non-standard)
 */
const mineBlock = () => send({ method: 'evm_mine' });

/**
 *  Gets the time of the last block.
 */
const currentTime = async () => {
  const { timestamp } = await web3.eth.getBlock('latest');
  return timestamp;
};

/**
 *  Increases the time in the EVM.
 *  @param seconds Number of seconds to increase the time by
 */
const fastForward = async seconds => {
  // It's handy to be able to be able to pass big numbers in as we can just
  // query them from the contract, then send them back. If not changed to
  // a number, this causes much larger fast forwards than expected without error.
  if (BN.isBN(seconds)) seconds = seconds.toNumber();

  // And same with strings.
  if (typeof seconds === 'string') seconds = parseFloat(seconds);

  await send({
    method: 'evm_increaseTime',
    params: [seconds],
  });

  await mineBlock();
};

contract("Vault Tests", async accounts => {
  it("should successfully run", async () => {
    
    let deployer = "0x947B7742C403f20e5FaCcDAc5E092C943E7D0277";
    let multisig = "0xa3C5A1e09150B75ff251c1a7815A07182c3de2FB";
    let addressZero = "0x0000000000000000000000000000000000000000"

    let frax = await IERC20.at(contractList.frax.frax);
    let fxs = await IERC20.at(contractList.frax.fxs);
    let vefxs = await IERC20.at(contractList.frax.vefxs);
    let crv = await IERC20.at(contractList.system.crv);
    let cvx = await IERC20.at(contractList.system.cvx);
    let cvxfxs = await IERC20.at(contractList.system.cvxFxs);

    let userA = accounts[0];
    let userB = accounts[1];
    let userC = accounts[2];
    let userD = accounts[3];
    let userZ = "0xAAc0aa431c237C2C0B5f041c8e59B3f1a43aC78F";
    var userNames = {};
    userNames[userA] = "A";
    userNames[userB] = "B";
    userNames[userC] = "C";
    userNames[userD] = "D";
    userNames[userZ] = "Z";

    const advanceTime = async (secondsElaspse) => {
      await time.increase(secondsElaspse);
      await time.advanceBlock();
      console.log("\n  >>>>  advance time " +(secondsElaspse/86400) +" days  >>>>\n");
    }
    const day = 86400;

    const getTimestampInSeconds = async () => {
      // return Math.floor(Date.now() / 1000)
      var t = await time.latest()
      return Number(t);
    }
    await getTimestampInSeconds().then(a=>console.log("time: " +a))
    // console.log("time: " +getTimestampInSeconds());

    await unlockAccount(deployer);
    await unlockAccount(multisig);

    let voteproxy = await FraxVoterProxy.at(contractList.system.voteProxy);
    var booster = await Booster.at(contractList.system.booster);
    var curvebooster = await ICurveConvex.at("0xF403C135812408BFbE8713b5A23a04b3D48AAE31");
    let controller = await IFraxGaugeController.at(contractList.frax.gaugeController);

    let feeReg = await FeeRegistry.at(contractList.system.feeRegistry);
    let poolReg = await PoolRegistry.at(contractList.system.poolRegistry);
    let poolUtil = await PoolUtilities.at(contractList.system.poolUtility);
    let feeDepo = await FeeDeposit.at(contractList.system.feeDeposit);
    let rewardMaster = await MultiRewards.at(contractList.system.rewardImplementation);

    let actingUser = userA
    await unlockAccount(actingUser);
    console.log("acting user: " +actingUser);

     //frax farm
    let stakingAddress = await IFraxFarmERC20_V2.at("0x4c9AD8c53d0a001E7fF08a3E5E26dE6795bEA5ac"); //eusd/fraxbp
    let lptoken = await IERC20.at("0xAEda92e6A3B1028edc139A4ae56Ec881f3064D4F"); //eusd/fraxbp
    let lpHolder = "0x8605dc0C339a2e7e85EEA043bD29d42DA2c6D784"; //eusd/fraxbp

    //STG/fraxbp
    // let stakingAddress = await IFraxFarmERC20_V2.at("0xd600A3E4F57E718A7ad6A0cbb10c2A92c57827e6");
    // let lptoken = await IERC20.at("0x9de1c3D446237ab9BaFF74127eb4F303802a2683");
    // let lpHolder = "0x8133e6B0B2420bBa10574A6668ea275f5E7Ed253";

    //uzd/fraxbp
    // let stakingAddress = await IFraxFarmERC20_V2.at("0x7677D1AADcd42dC40E758115FfDE5e1E10B7f30b");
    // let lptoken = await IERC20.at("0x68934F60758243eafAf4D2cFeD27BF8010bede3a");
    // let lpHolder = "0xBdCA4F610e7101Cc172E2135ba025737B99AbD30";


    let tokenaddy = await stakingAddress.stakingToken();
    let stakingToken = await IERC20.at(tokenaddy);
    let stakingwrapper = await IConvexWrapperV2.at(stakingToken.address);
   
    //get tokens
    await unlockAccount(lpHolder);
    await lptoken.transfer(actingUser,web3.utils.toWei("100000.0", "ether"),{from:lpHolder,gasPrice:0});
    console.log("lp tokens transfered");

    // await lptoken.approve(curvebooster.address, web3.utils.toWei("100000.0","ether"),{from:actingUser});
    // console.log("approved to booster")
    // await curvebooster.deposit(158,web3.utils.toWei("100000.0","ether"), true,{from:actingUser});
    // console.log("staked on booster");
    // return;


    let fxsholder = "0xc8418aF6358FFddA74e09Ca9CC3Fe03Ca6aDC5b0";
    await unlockAccount(fxsholder);
    await fxs.transfer(stakingAddress.address,web3.utils.toWei("100000.0", "ether"),{from:fxsholder,gasPrice:0});
    console.log("fxs transfered to farm");
    

    //setup distro and manager
    // await stakingwrapper.setVault(stakingAddress.address,{from:deployer});
    var distro = await stakingwrapper.distroContract();
    console.log("set vault, distro: " +distro)

    //overwrite with test distro
    // let testdistro = await GaugeExtraRewardDistributor.new();
    // console.log("new testdistro: " +testdistro.address);
    
    // await stakingwrapper.setDistributor(stakingAddress.address, testdistro.address,{from:deployer});
    // console.log("set test distributor")
    distro = await stakingwrapper.distroContract();
    var extrarewardsdistro = await GaugeExtraRewardDistributor.at(distro);
    console.log("using distro: " +distro)

    await extrarewardsdistro.farm().then(a=>console.log("distro farm: " +a))
    await extrarewardsdistro.wrapper().then(a=>console.log("distro wrapper: " +a))
    console.log("farm: " +stakingAddress.address);
    console.log("wrapper: " +stakingwrapper.address);

    await stakingwrapper.rewardRedirect(stakingAddress.address).then(a=>console.log("rewards redirected: " +a))


    await stakingToken.balanceOf(actingUser).then(a=>console.log("staking token actingUser: " +a));
    await lptoken.balanceOf(actingUser).then(a=>console.log("lp token actingUser: " +a));
    await lptoken.approve(stakingwrapper.address, web3.utils.toWei("100000.0","ether"),{from:actingUser});
    console.log("approved to wrapper")
    await stakingwrapper.user_checkpoint(addressZero);
    console.log("checkpoint address(0)");
    await stakingwrapper.deposit(web3.utils.toWei("100000.0","ether"), actingUser,{from:actingUser});
    console.log("deposited to wrapper");
    var wrapperbal = await stakingwrapper.balanceOf(actingUser);
    console.log("balance to unwrap: " +wrapperbal)
    await stakingwrapper.withdrawAndUnwrap(wrapperbal, {from:actingUser});
    console.log("unwrapped");
    await stakingToken.balanceOf(actingUser).then(a=>console.log("staking token actingUser: " +a));
    await lptoken.balanceOf(actingUser).then(a=>console.log("lp token actingUser: " +a));


    var farmOwner = await stakingAddress.owner();
    await unlockAccount(farmOwner);
    // await stakingAddress.changeTokenManager(crv.address, distro, {from:farmOwner, gasPrice:0});
    // await stakingAddress.changeTokenManager(cvx.address, distro, {from:farmOwner, gasPrice:0});
    // console.log("set token managers")
    // await stakingAddress.setRewardVars(crv.address, 0, addressZero, distro, {from:farmOwner, gasPrice:0});
    // await stakingAddress.setRewardVars(cvx.address, 0, addressZero, distro, {from:farmOwner, gasPrice:0});
    // console.log("set rewards vars and distributor")

    //add to gauge
    console.log("add gauge and vote");
    let fraxadmin = "0xb1748c79709f4ba2dd82834b8c82d4a505003f27";
    await unlockAccount(fraxadmin);
    // await advanceTime(day*14);
    // await stakingAddress.sync();
    // console.log("synced");
    // await controller.add_gauge(stakingAddress.address,0,0,{from:fraxadmin,gasPrice:0});
    // var fxsrewardsdistro = await IFraxRewardDistributor.at(contractList.frax.rewardDistributor);
    // await fxsrewardsdistro.setGaugeState(stakingAddress.address, false, true, {from:fraxadmin, gasPrice:0});
    // console.log("added to reward whitelist");
    // var fpigauge = "0x0a08673E3d7c454E1c6b27acD059C50Df6727FC9"
    // await booster.voteGaugeWeight(controller.address, [fpigauge], [0], {from:multisig, gasPrice:0});
    // await booster.voteGaugeWeight(controller.address, [stakingAddress.address], [1000], {from:multisig, gasPrice:0});
    console.log("voted");
    await stakingAddress.periodFinish().then(a=>console.log("period finish: " +a))
    await getTimestampInSeconds().then(a=>console.log("time: " +a))
    var t = await getTimestampInSeconds();
    t = Number(t);
    var d = await stakingAddress.rewardsDuration();
    d = Number(d);
    var pf = await stakingAddress.periodFinish();
    pf = Number(pf);
    console.log("time over period finish: " +(t-pf))
    var pl = Math.floor((t + d) / d)
    pl *= d;
    console.log("duration from now: " +pl);
    pl = pl - pf;
    console.log("period length: " +pl);
    await stakingAddress.sync();
    console.log("synced");

    await advanceTime(day*7);
    await stakingAddress.periodFinish().then(a=>console.log("period finish: " +a))
    await stakingAddress.rewardsDuration().then(a=>console.log("rewardsDuration: " +a))
    await getTimestampInSeconds().then(a=>console.log("time: " +a))
    var t = await getTimestampInSeconds();
    t = Number(t);
    var d = await stakingAddress.rewardsDuration();
    d = Number(d);
    var pf = await stakingAddress.periodFinish();
    pf = Number(pf);
    console.log("time over period finish: " +(t-pf))
    var pl = Math.floor((t + d) / d)
    pl *= d;
    console.log("duration from now: " +pl);
    pl = pl - pf;
    console.log("period length: " +pl);
    await stakingAddress.sync();
    console.log("synced");

    //temp: set valid proxy
    var stakingOwner = await stakingAddress.owner();
    await unlockAccount(stakingOwner);
    // await stakingAddress.toggleValidVeFXSProxy(contractList.system.voteProxy,{from:stakingOwner,gasPrice:0});
    await stakingAddress.getProxyFor(contractList.system.voteProxy).then(a=>console.log("Proxy check: " +a));

    //harvest convex pool
    var poolid = await stakingwrapper.convexPoolId();
    await curvebooster.earmarkRewards(poolid,{from:userC});
    console.log("harvested convex pool " +poolid);

    let impl = await StakingProxyConvex.new();
    // let impl = await StakingProxyConvex.at(contractList.system.vaultConvexImplementation);

    var poolcount = await poolReg.poolLength();
    console.log("pool count: " +poolcount);

    var tx = await booster.addPool(impl.address, stakingAddress.address, stakingToken.address,{from:deployer,gasPrice:0});
    console.log("pool added, gas: " +tx.receipt.gasUsed);
    await poolReg.poolLength().then(a=>console.log("new pool count: " +a));

    var poolinfo = await poolReg.poolInfo(poolcount);
    console.log(poolinfo);
    
    //create vault
    var tx = await booster.createVault(poolcount,{from:actingUser});
    
    //get vault
    let vaultAddress = await poolReg.vaultMap(poolcount,actingUser);
    let vault = await StakingProxyConvex.at(vaultAddress)
    console.log("vault at " +vault.address);// +", gas: " +tx.receipt.gasUsed);

        

    var tokenBalance = await lptoken.balanceOf(actingUser);
    console.log("tokenBalance: " +tokenBalance);

    var lockDuration = day*7;
    // var lockDuration = day*364*3;
    //stake
    await lptoken.approve(vault.address, web3.utils.toWei("100000.0","ether"),{from:actingUser});
    var tx = await vault.stakeLockedCurveLp(web3.utils.toWei("10000.0","ether"), lockDuration, {from:actingUser});
    console.log("staked, gas: " +tx.receipt.gasUsed);

    var stakeInfo = await stakingAddress.lockedStakesOf(vault.address);
    console.log("stake info: " +stakeInfo);
    console.log("kek id: " +stakeInfo[0][0]);
    console.log("stake info: " +JSON.stringify(stakeInfo));
    await stakingAddress.userStakedFrax(vault.address).then(a=>console.log("userStakedFrax: " +a));
    await stakingAddress.getAllRewardTokens().then(a=>console.log("getAllRewardTokens: " +a))
    await stakingAddress.lockedLiquidityOf(vault.address).then(a=>console.log("lockedLiquidityOf: " +a))
    await stakingAddress.combinedWeightOf(vault.address).then(a=>console.log("combinedWeightOf: " +a))
    await stakingAddress.veFXSMultiplier(vault.address).then(a=>console.log("veFXSMultiplier: " +a))

    await poolUtil.weightedRewardRates(stakingAddress.address).then(a=>console.log("pool util -> weightedRewardRates: " +a));
    await poolUtil.userBoostedRewardRates(stakingAddress.address, vault.address).then(a=>console.log("pool util -> userBoostedRewardRates: " +a));
    await poolUtil.veFXSMultiplier(stakingAddress.address).then(a=>console.log("pool util -> veFXSMultiplier: " +a));

    // await advanceTime(day*10);
    // await vault.withdrawLockedAndUnwrap(stakeInfo[0][0],{from:actingUser});
    // console.log("-> withdrawn");
    // await stakingToken.balanceOf(actingUser).then(a=>console.log("staking token actingUser: " +a));
    // await lptoken.balanceOf(actingUser).then(a=>console.log("lp token actingUser: " +a));

    // var tx = await vault.stakeLockedCurveLp(web3.utils.toWei("10000.0","ether"), lockDuration, {from:actingUser});
    // console.log("staked again, gas: " +tx.receipt.gasUsed);

    // var stakeInfo = await stakingAddress.lockedStakesOf(vault.address);
    // console.log("stake info: " +stakeInfo);

    console.log("---- lock longer ---");
    var t = await getTimestampInSeconds()
    console.log("timestamp in seconds: " +t)
    // t = Math.floor(Date.now() / 1000);
    // console.log("date.now: " +t)
    t = Number(t) + (day*10);
    console.log("lock timestamp: " +t)
    var tx = await vault.lockLonger(stakeInfo[0][0], t);
    console.log("lock longer, gas: " +tx.receipt.gasUsed);
    var stakeInfo = await stakingAddress.lockedStakesOf(vault.address);
    console.log("stake info: " +stakeInfo);

    await stakingAddress.userStakedFrax(vault.address).then(a=>console.log("userStakedFrax: " +a));
    await stakingAddress.getAllRewardTokens().then(a=>console.log("getAllRewardTokens: " +a))
    await stakingAddress.lockedLiquidityOf(vault.address).then(a=>console.log("lockedLiquidityOf: " +a))
    await stakingAddress.combinedWeightOf(vault.address).then(a=>console.log("combinedWeightOf: " +a))
    await stakingAddress.veFXSMultiplier(vault.address).then(a=>console.log("veFXSMultiplier: " +a))

    await poolUtil.weightedRewardRates(stakingAddress.address).then(a=>console.log("pool util -> weightedRewardRates: " +a));
    await poolUtil.userBoostedRewardRates(stakingAddress.address, vault.address).then(a=>console.log("pool util -> userBoostedRewardRates: " +a));
    await poolUtil.veFXSMultiplier(stakingAddress.address).then(a=>console.log("pool util -> veFXSMultiplier: " +a));

    //stake again with additional
    // await stakingToken.approve(vault.address, web3.utils.toWei("100000.0","ether"));
    var tx = await vault.lockAdditionalCurveLp(stakeInfo[0][0],web3.utils.toWei("10000.0","ether"),{from:actingUser});
    console.log("staked additional, gas: " +tx.receipt.gasUsed);
    var stakeInfo = await stakingAddress.lockedStakesOf(vault.address);
    console.log("stake info: " +stakeInfo);
    await stakingAddress.userStakedFrax(vault.address).then(a=>console.log("userStakedFrax: " +a));

    const goToNextEpoch = async (cnt) => {
      console.log("\ngoToNextEpoch >> " +cnt);
      await getTimestampInSeconds().then(a=>console.log("current time: " +a))
      var t = await getTimestampInSeconds();
      t = Number(t);
      var pf = await stakingAddress.periodFinish();
      pf = Number(pf);
      console.log("time until period ends: " +(pf - t) );


      await stakingAddress.periodFinish().then(a=>console.log("periodFinish: " +a))
      await crv.balanceOf(stakingAddress.address).then(a=>console.log("crv on farm: " +a))
      await cvx.balanceOf(stakingAddress.address).then(a=>console.log("cvx on farm: " +a))
      await stakingAddress.rewardRates(0).then(a=>console.log("reward rate(0): " +a))
      await stakingAddress.rewardRates(1).then(a=>console.log("reward rate(1): " +a))
      await stakingAddress.rewardRates(2).then(a=>console.log("reward rate(2): " +a))
      await advanceTime(day*7 * cnt);
      await getTimestampInSeconds().then(a=>console.log("current time: " +a))
      await stakingAddress.lastUpdateTime().then(a=>console.log("lastUpdateTime: " +a))
      await stakingAddress.rewardsPerToken().then(a=>console.log("rewardsPerToken(1): " +a[1]))
      await stakingAddress.earned(vault.address).then(a=>console.log("farm.earned(vault): " +a[1]));
      await stakingAddress.sync();
      console.log("farm synced")
      await stakingAddress.lastUpdateTime().then(a=>console.log("lastUpdateTime: " +a))
      await stakingAddress.rewardsPerToken().then(a=>console.log("rewardsPerToken(1): " +a[1]))
      // await testdistro.weeksElapsed().then(a=>console.log("distro weeks: " +a))
      // await testdistro.currentLength().then(a=>console.log("distro length: " +a))
      // await testdistro.crvReward().then(a=>console.log("distro crvReward: " +a))
      // await testdistro.cvxReward().then(a=>console.log("distro cvxReward: " +a))
      await stakingAddress.rewardRates(0).then(a=>console.log("reward rate(0): " +a))
      await stakingAddress.rewardRates(1).then(a=>console.log("reward rate(1): " +a))
      await stakingAddress.rewardRates(2).then(a=>console.log("reward rate(2): " +a))
      await crv.balanceOf(stakingAddress.address).then(a=>console.log("crv on farm: " +a))
      await cvx.balanceOf(stakingAddress.address).then(a=>console.log("cvx on farm: " +a))
      
      await crv.balanceOf(actingUser).then(a=>console.log("user A crv: " +a));
      await cvx.balanceOf(actingUser).then(a=>console.log("user A cvx: " +a));
      await stakingAddress.earned(vault.address).then(a=>console.log("farm.earned(vault): " +a[1]));
      await stakingAddress.lastUpdateTime().then(a=>console.log("lastUpdateTime: " +a))
      await stakingAddress.rewardsPerToken().then(a=>console.log("rewardsPerToken(1): " +a[1]))
      await vault.getReward();
      console.log("-> vault get reward");
      await stakingAddress.lastUpdateTime().then(a=>console.log("lastUpdateTime: " +a))
      await stakingAddress.rewardsPerToken().then(a=>console.log("rewardsPerToken(1): " +a[1]))
      await crv.balanceOf(stakingAddress.address).then(a=>console.log("crv on farm: " +a))
      await cvx.balanceOf(stakingAddress.address).then(a=>console.log("cvx on farm: " +a))

      await crv.balanceOf(actingUser).then(a=>console.log("user A crv: " +a));
      await cvx.balanceOf(actingUser).then(a=>console.log("user A cvx: " +a));
      await poolUtil.weightedRewardRates(stakingAddress.address).then(a=>console.log("pool util -> weightedRewardRates: " +a));
      await poolUtil.userBoostedRewardRates(stakingAddress.address, vault.address).then(a=>console.log("pool util -> userBoostedRewardRates: " +a));
      await curvebooster.earmarkRewards(poolid,{from:userC});
      console.log("harvested convex pool " +poolid);
    }

    const goToNextEpochNoSync = async (cnt) => {
      console.log("\goToNextEpochNoSync >> " +cnt);
      await getTimestampInSeconds().then(a=>console.log("current time: " +a))
      var t = await getTimestampInSeconds();
      t = Number(t);
      var pf = await stakingAddress.periodFinish();
      pf = Number(pf);
      console.log("time until period ends: " +(pf - t) );
      await crv.balanceOf(stakingAddress.address).then(a=>console.log("crv on farm: " +a))
      await cvx.balanceOf(stakingAddress.address).then(a=>console.log("cvx on farm: " +a))
      await crv.balanceOf(actingUser).then(a=>console.log("user A crv: " +a));
      await cvx.balanceOf(actingUser).then(a=>console.log("user A cvx: " +a));
      await advanceTime(day*7*cnt);
      await getTimestampInSeconds().then(a=>console.log("current time: " +a))
      // await stakingAddress.sync();
      await stakingAddress.rewardRates(0).then(a=>console.log("reward rate(0): " +a))
      await stakingAddress.rewardRates(1).then(a=>console.log("reward rate(1): " +a))
      await stakingAddress.rewardRates(2).then(a=>console.log("reward rate(2): " +a))
      await stakingAddress.lastUpdateTime().then(a=>console.log("lastUpdateTime: " +a))
      await stakingAddress.rewardsPerToken().then(a=>console.log("rewardsPerToken(1): " +a[1]))
      await stakingAddress.earned(vault.address).then(a=>console.log("farm.earned(vault): " +a[1]));
      await vault.getReward();
      console.log("-> vault get reward");
      console.log("farm synced via get reward")
      await stakingAddress.lastUpdateTime().then(a=>console.log("lastUpdateTime: " +a))
      await stakingAddress.rewardsPerToken().then(a=>console.log("rewardsPerToken(1): " +a[1]))
      // await testdistro.weeksElapsed().then(a=>console.log("distro weeks: " +a))
      // await testdistro.currentLength().then(a=>console.log("distro length: " +a))
      // await testdistro.crvReward().then(a=>console.log("distro crvReward: " +a))
      // await testdistro.cvxReward().then(a=>console.log("distro cvxReward: " +a))
      await stakingAddress.rewardRates(0).then(a=>console.log("reward rate(0): " +a))
      await stakingAddress.rewardRates(1).then(a=>console.log("reward rate(1): " +a))
      await stakingAddress.rewardRates(2).then(a=>console.log("reward rate(2): " +a))
      await crv.balanceOf(stakingAddress.address).then(a=>console.log("crv on farm: " +a))
      await cvx.balanceOf(stakingAddress.address).then(a=>console.log("cvx on farm: " +a))
      
      await crv.balanceOf(actingUser).then(a=>console.log("user A crv: " +a));
      await cvx.balanceOf(actingUser).then(a=>console.log("user A cvx: " +a));
      await poolUtil.weightedRewardRates(stakingAddress.address).then(a=>console.log("pool util -> weightedRewardRates: " +a));
      await poolUtil.userBoostedRewardRates(stakingAddress.address, vault.address).then(a=>console.log("pool util -> userBoostedRewardRates: " +a));
      await curvebooster.earmarkRewards(poolid,{from:userC});
      console.log("harvested convex pool " +poolid);
    }
    await goToNextEpochNoSync(1);
    await goToNextEpoch(1);
    await goToNextEpochNoSync(2);
    await goToNextEpoch(2);
    await goToNextEpoch(1);

    // return;

    console.log("\n\n\n >>>> Withdraw >>> \n");
    
    //withdraw
    await advanceTime(lockDuration*2 + day);
    await stakingwrapper.earned.call(vault.address).then(a=>console.log("stakingwrapper earned: " +JSON.stringify(a) ));
    await vault.earned.call().then(a=>console.log("vault earned: " +JSON.stringify(a) ));

    await crv.balanceOf(stakingAddress.address).then(a=>console.log("farm crv: " +a));
    await cvx.balanceOf(stakingAddress.address).then(a=>console.log("farm cvx: " +a));

    await stakingAddress.sync();
    console.log("synced");

    await crv.balanceOf(stakingAddress.address).then(a=>console.log("farm crv: " +a));
    await cvx.balanceOf(stakingAddress.address).then(a=>console.log("farm cvx: " +a));
    await crv.balanceOf(actingUser).then(a=>console.log("user A crv: " +a));
    await cvx.balanceOf(actingUser).then(a=>console.log("user A cvx: " +a));
    await vault.earned.call().then(a=>console.log("vault earned: " +JSON.stringify(a) ));
    await vault.getReward();
    console.log("-> vault get reward");
    await crv.balanceOf(stakingAddress.address).then(a=>console.log("farm crv: " +a));
    await cvx.balanceOf(stakingAddress.address).then(a=>console.log("farm cvx: " +a));
    await crv.balanceOf(actingUser).then(a=>console.log("user A crv: " +a));
    await cvx.balanceOf(actingUser).then(a=>console.log("user A cvx: " +a));

    await stakingToken.balanceOf(actingUser).then(a=>console.log("staking token actingUser: " +a));
    await lptoken.balanceOf(actingUser).then(a=>console.log("lp token actingUser: " +a));
    // await vault.withdrawLocked(stakeInfo[0][0],{from:actingUser});
    await vault.withdrawLockedAndUnwrap(stakeInfo[0][0],{from:actingUser});
    console.log("-> withdrawn");
    await stakingToken.balanceOf(actingUser).then(a=>console.log("staking token actingUser: " +a));
    await lptoken.balanceOf(actingUser).then(a=>console.log("lp token actingUser: " +a));
    await stakingToken.balanceOf(vault.address).then(a=>console.log("staking token vault: " +a));
    await lptoken.balanceOf(vault.address).then(a=>console.log("lp token vault: " +a));

    // var wrapperbal = await stakingwrapper.balanceOf(actingUser);
    // console.log("balance to unwrap: " +wrapperbal)
    // await stakingwrapper.withdrawAndUnwrap(wrapperbal, {from:actingUser});
    // console.log("unwrapped");
    // await stakingToken.balanceOf(actingUser).then(a=>console.log("staking token actingUser: " +a));
    // await lptoken.balanceOf(actingUser).then(a=>console.log("lp token actingUser: " +a));

    await vault.earned.call().then(a=>console.log("vault earned: " +JSON.stringify(a) ));
    await fxs.balanceOf(actingUser).then(a=>console.log("user A fxs: " +a));
    await crv.balanceOf(actingUser).then(a=>console.log("user A crv: " +a));
    await cvx.balanceOf(actingUser).then(a=>console.log("user A cvx: " +a));
    await crv.balanceOf(vault.address).then(a=>console.log("vault crv: " +a));
    await cvx.balanceOf(vault.address).then(a=>console.log("vault cvx: " +a));
    await fxs.balanceOf(feeDepo.address).then(a=>console.log("feeDepo fxs: " +a));
    await vault.getReward();
    console.log("-> vault get reward");
    await fxs.balanceOf(actingUser).then(a=>console.log("user A fxs: " +a));
    await crv.balanceOf(actingUser).then(a=>console.log("user A crv: " +a));
    await cvx.balanceOf(actingUser).then(a=>console.log("user A cvx: " +a));
    await crv.balanceOf(vault.address).then(a=>console.log("vault crv: " +a));
    await cvx.balanceOf(vault.address).then(a=>console.log("vault cvx: " +a));
    await fxs.balanceOf(feeDepo.address).then(a=>console.log("feeDepo fxs: " +a));
  });
});


