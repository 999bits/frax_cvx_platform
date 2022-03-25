// // SPDX-License-Identifier: MIT
pragma solidity 0.8.10;
// /**
//  *Submitted for verification at Etherscan.io on 2020-07-17
//  */

// /*
//    ____            __   __        __   _
//   / __/__ __ ___  / /_ / /  ___  / /_ (_)__ __
//  _\ \ / // // _ \/ __// _ \/ -_)/ __// / \ \ /
// /___/ \_, //_//_/\__//_//_/\__/ \__//_/ /_\_\
//      /___/

// * Synthetix: BaseRewardPool.sol
// *
// * Docs: https://docs.synthetix.io/
// *
// *
// * MIT License
// * ===========
// *
// * Copyright (c) 2020 Synthetix
// *
// * Permission is hereby granted, free of charge, to any person obtaining a copy
// * of this software and associated documentation files (the "Software"), to deal
// * in the Software without restriction, including without limitation the rights
// * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// * copies of the Software, and to permit persons to whom the Software is
// * furnished to do so, subject to the following conditions:
// *
// * The above copyright notice and this permission notice shall be included in all
// * copies or substantial portions of the Software.
// *
// * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// */

// import "./interfaces/MathUtil.sol";
// import "./interfaces/IRewards.sol";
// import "./interfaces/IDeposit.sol";
// import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
// import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';



// contract BaseRewardPool {
//     using SafeERC20 for IERC20;

//     IERC20 public rewardToken;
//     IERC20 public stakingToken;
//     uint256 public constant duration = 7 days;
//     uint256 public constant newRewardRatio = 830;

//     address public operator;
//     address public rewardManager;

//     uint256 public pid;
//     uint256 public periodFinish;
//     uint256 public rewardRate;
//     uint256 public lastUpdateTime;
//     uint256 public rewardPerTokenStored;
//     uint256 public queuedRewards;
//     uint256 public currentRewards;
//     uint256 public historicalRewards;
    
//     uint256 private _totalSupply;
//     mapping(address => uint256) public userRewardPerTokenPaid;
//     mapping(address => uint256) public rewards;
//     mapping(address => uint256) private _balances;

//     address[] public extraRewards;

//     event RewardAdded(uint256 reward);
//     event Staked(address indexed user, uint256 amount);
//     event Withdrawn(address indexed user, uint256 amount);
//     event RewardPaid(address indexed user, uint256 reward);

//     constructor(){}

//     function initialize(
//         uint256 pid_,
//         address stakingToken_,
//         address rewardToken_,
//         address operator_,
//         address rewardManager_
//     ) external {
//         require(address(stakingToken) == address(0),"already init");

//         pid = pid_;
//         stakingToken = IERC20(stakingToken_);
//         rewardToken = IERC20(rewardToken_);
//         operator = operator_;
//         rewardManager = rewardManager_;
//     }

//     function totalSupply() public view returns (uint256) {
//         return _totalSupply;
//     }

//     function balanceOf(address account) public view returns (uint256) {
//         return _balances[account];
//     }

//     function extraRewardsLength() external view returns (uint256) {
//         return extraRewards.length;
//     }

//     function addExtraReward(address _reward) external returns(bool){
//         require(msg.sender == rewardManager, "!authorized");
//         require(_reward != address(0),"!reward setting");

//         extraRewards.push(_reward);
//         return true;
//     }

//     function clearExtraRewards() external{
//         require(msg.sender == rewardManager, "!authorized");
//         delete extraRewards;
//     }

//     modifier updateReward(address account) {
//         rewardPerTokenStored = rewardPerToken();
//         lastUpdateTime = lastTimeRewardApplicable();
//         if (account != address(0)) {
//             rewards[account] = earned(account);
//             userRewardPerTokenPaid[account] = rewardPerTokenStored;
//         }
//         _;
//     }

//     function lastTimeRewardApplicable() public view returns (uint256) {
//         return MathUtil.min(block.timestamp, periodFinish);
//     }

//     function rewardPerToken() public view returns (uint256) {
//         if (totalSupply() == 0) {
//             return rewardPerTokenStored;
//         }
//         return rewardPerTokenStored + ((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18 / totalSupply());
//         // return
//         //     rewardPerTokenStored.add(
//         //         lastTimeRewardApplicable()
//         //             .sub(lastUpdateTime)
//         //             .mul(rewardRate)
//         //             .mul(1e18)
//         //             .div(totalSupply())
//         //     );
//     }

//     function earned(address account) public view returns (uint256) {
//         return rewards[account] + (balanceOf(account) * (rewardPerToken() - userRewardPerTokenPaid[account]) / 1e18);
//         // return
//         //     balanceOf(account)
//         //         .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
//         //         .div(1e18)
//         //         .add(rewards[account]);
//     }

//     function stake(uint256 _amount)
//         public
//         updateReward(msg.sender)
//         returns(bool)
//     {
//         require(_amount > 0, 'RewardPool : Cannot stake 0');
        
//         //also stake to linked rewards
//         for(uint i=0; i < extraRewards.length; i++){
//             IRewards(extraRewards[i]).stake(msg.sender, _amount);
//         }

//         _totalSupply += _amount;
//         _balances[msg.sender] += _amount;

//         stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
//         emit Staked(msg.sender, _amount);

        
//         return true;
//     }

//     function stakeAll() external returns(bool){
//         uint256 balance = stakingToken.balanceOf(msg.sender);
//         stake(balance);
//         return true;
//     }

//     function stakeFor(address _for, uint256 _amount)
//         public
//         updateReward(_for)
//         returns(bool)
//     {
//         require(_amount > 0, 'RewardPool : Cannot stake 0');
        
//         //also stake to linked rewards
//         for(uint i=0; i < extraRewards.length; i++){
//             IRewards(extraRewards[i]).stake(_for, _amount);
//         }

//         //give to _for
//         _totalSupply += _amount;
//         _balances[_for] += _amount;

//         //take away from sender
//         stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
//         emit Staked(_for, _amount);
        
//         return true;
//     }


//     function withdraw(uint256 amount, bool claim)
//         public
//         updateReward(msg.sender)
//         returns(bool)
//     {
//         require(amount > 0, 'RewardPool : Cannot withdraw 0');

//         //also withdraw from linked rewards
//         for(uint i=0; i < extraRewards.length; i++){
//             IRewards(extraRewards[i]).withdraw(msg.sender, amount);
//         }

//         _totalSupply -= amount;
//         _balances[msg.sender] -= amount;

//         stakingToken.safeTransfer(msg.sender, amount);
//         emit Withdrawn(msg.sender, amount);
     
//         if(claim){
//             getReward(msg.sender,true);
//         }

//         return true;
//     }

//     function withdrawAll(bool claim) external{
//         withdraw(_balances[msg.sender],claim);
//     }

//     function withdrawAndUnwrap(uint256 amount, bool claim) public updateReward(msg.sender) returns(bool){

//         //also withdraw from linked rewards
//         for(uint i=0; i < extraRewards.length; i++){
//             IRewards(extraRewards[i]).withdraw(msg.sender, amount);
//         }
        
//         _totalSupply -= amount;
//         _balances[msg.sender] -= amount;

//         //tell operator to withdraw from here directly to user
//         IDeposit(operator).withdrawTo(pid,amount,msg.sender);
//         emit Withdrawn(msg.sender, amount);

//         //get rewards too
//         if(claim){
//             getReward(msg.sender,true);
//         }
//         return true;
//     }

//     function withdrawAllAndUnwrap(bool claim) external{
//         withdrawAndUnwrap(_balances[msg.sender],claim);
//     }

//     function getReward(address _account, bool _claimExtras) public updateReward(_account) returns(bool){
//         uint256 reward = earned(_account);
//         if (reward > 0) {
//             rewards[_account] = 0;
//             rewardToken.safeTransfer(_account, reward);
//             IDeposit(operator).rewardClaimed(pid, _account, reward);
//             emit RewardPaid(_account, reward);
//         }

//         //also get rewards from linked rewards
//         if(_claimExtras){
//             for(uint i=0; i < extraRewards.length; i++){
//                 IRewards(extraRewards[i]).getReward(_account);
//             }
//         }

//         //check for new cycle
//         _checkNewCycle();

//         return true;
//     }

//     function getReward() external returns(bool){
//         getReward(msg.sender,true);
//         return true;
//     }

//     function donate(uint256 _amount) external returns(bool){
//         IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), _amount);
//         queuedRewards += _amount;
//         return true;
//     }

//     function checkNewCycle() external returns(bool){
//         return _checkNewCycle();
//     }

//     function _checkNewCycle() internal returns(bool){
//         if (block.timestamp >= periodFinish) {
//             _queueNewRewards(0);
//             return true;
//         }
//         return false;
//     }

//     function queueNewRewards(uint256 _rewards) external returns(bool){
//         require(msg.sender == operator, "!authorized");
//         return _queueNewRewards(_rewards);
//     }

//     function _queueNewRewards(uint256 _rewards) internal returns(bool){
        
//         _rewards += queuedRewards;

//         if (block.timestamp >= periodFinish) {
//             notifyRewardAmount(_rewards);
//             queuedRewards = 0;
//             return true;
//         }

//         //et = now - (finish-duration)
//         uint256 elapsedTime = block.timestamp - (periodFinish - duration);
//         //current at now: rewardRate * elapsedTime
//         uint256 currentAtNow = rewardRate * elapsedTime;
//         uint256 queuedRatio = currentAtNow * 1000 / _rewards;

//         if(queuedRatio < newRewardRatio){
//             notifyRewardAmount(_rewards);
//             queuedRewards = 0;
//         }else{
//             queuedRewards = _rewards;
//         }
//         return true;
//     }

//     function notifyRewardAmount(uint256 reward)
//         internal
//         updateReward(address(0))
//     {
//         historicalRewards += reward;
//         if (block.timestamp >= periodFinish) {
//             rewardRate = reward / duration;
//         } else {
//             uint256 remaining = periodFinish - block.timestamp;
//             uint256 leftover = remaining * rewardRate;
//             reward += leftover;
//             rewardRate = reward / duration;
//         }
//         currentRewards = reward;
//         lastUpdateTime = block.timestamp;
//         periodFinish = block.timestamp + duration;
//         emit RewardAdded(reward);
//     }
// }