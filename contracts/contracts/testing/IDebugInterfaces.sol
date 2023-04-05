// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

// import '@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';
// import '@openzeppelin/contracts/token/ER721/IERC721.sol';
// import '@openzeppelin/contracts/token/ER721/extensions/IERC721Enumerable.sol';
// import '@openzeppelin/contracts/token/ER721/extensions/IERC721Metadata.sol';

interface ICvxLocker{
    function addReward(
        address _rewardsToken,
        address _distributor,
        bool _useBoost
    ) external;

    function approveRewardDistributor(
        address _rewardsToken,
        address _distributor,
        bool _approved
    ) external;

    function rewardData(address _token) external view returns(bool, uint40, uint208, uint40, uint208);
}


interface IExchange {
    function swapExactTokensForTokens(
        uint256,
        uint256,
        address[] calldata,
        address,
        uint256
    ) external;
}

interface I3CurveFi {
    function get_virtual_price() external view returns (uint256);


    function add_liquidity(
        // sBTC pool
        uint256[3] calldata amounts,
        uint256 min_mint_amount
    ) external;
    
}

interface I2CurveFi {
    function get_virtual_price() external view returns (uint256);

    function add_liquidity(
        // eurs pool
        uint256[2] calldata amounts,
        uint256 min_mint_amount
    ) external;
    
    function claimable_tokens(address) external view returns (uint256);    
    function claimable_rewards(address,address) external view returns (uint256);    
}

interface ICurveAavePool {
    function get_virtual_price() external view returns (uint256);

    function add_liquidity(
        // aave pool
        uint256[3] calldata amounts,
        uint256 min_mint_amount,
        bool use_underlying
    ) external;
    
    function claimable_tokens(address) external view returns (uint256);    
    function claimable_rewards(address,address) external view returns (uint256);    
}

interface ISPool {
    function get_virtual_price() external view returns (uint256);

    function add_liquidity(
        // susd pool
        uint256[4] calldata amounts,
        uint256 min_mint_amount
    ) external;
    
    function claimable_tokens(address) external view returns (uint256);    
    function claimable_reward(address) external view returns (uint256);
    function claim_rewards(address) external;
}

interface ICurveGaugeDebug {
    function claim_rewards(address) external;
    function claimable_tokens(address) external view returns (uint256);    
    function claimable_reward(address,address) external view returns (uint256);   
    function rewards_receiver(address) external view returns(address);
    function working_balances(address) external view returns(uint256);
    function working_supply() external view returns(uint256);
}

interface IWalletCheckerDebug{
    function approveWallet(address) external;
    function check(address) external view returns (bool);
    function owner() external view returns(address);
}

interface IVoteStarter{
    function newVote(bytes calldata, string calldata, bool, bool) external returns (uint256);
    function votesLength() external view returns (uint256);
    function executeVote(uint256 _vid) external;
}

interface IBurner{
    function withdraw_admin_fees(address) external;
    function burn(address) external;
    function execute() external;
}

interface IClaim{
    function claim(address) external;
}

interface ISnxRewards{
    function notifyRewardAmount(uint256) external;
}

interface IUniswapV2Router01 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);

    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
      external
      payable
      returns (uint[] memory amounts);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}


interface Multicaller{
    struct Call {
        address target;
        bytes callData;
    }

    function aggregate(Call[] memory calls) external returns (uint256 blockNumber, bytes[] memory returnData);
}



interface MulticallerView{
    struct Call {
        address target;
        bytes callData;
    }
    function aggregate(Call[] memory calls) external view returns (uint256 blockNumber, bytes[] memory returnData);
}


interface SushiChefV2{
    function deposit(uint256 pid, uint256 amount, address to) external;
    function withdraw(uint256 pid, uint256 amount, address to) external;
    function withdrawAndHarvest(uint256 pid, uint256 amount, address to) external;
    function add(uint256 allocPoint, address token, address rewarder) external;
    function set(uint256 pid, uint256 allocPoint, address rewarder, bool overwrite) external;
    function harvest(uint256 pid, address to) external;
    function harvestFromMasterChef() external;
    function poolInfo(uint256 pid) external view returns(uint128,uint64,uint64);
    function rewarder(uint256 pid) external view returns(address);
    function lpToken(uint256 pid) external view returns(address);
    function userInfo(uint256 pid, address account) external view returns(uint256, uint256);
    function pendingSushi(uint256 pid, address account) external view returns(uint256);
    function batch(bytes[] calldata calls, bool revertOnFail) external returns (bool[] memory successes, bytes[] memory results);
}

interface SushiChefV1{
    function set(uint256 pid, uint256 allocPoint, bool withUpdate) external;
}