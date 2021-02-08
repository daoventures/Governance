const {balance, BN, constants, ether, expectEvent, expectRevert, send, time} = require("@openzeppelin/test-helpers");
const { assert, expect } = require("hardhat");
const { modules } = require("web3");
const { add } = require("mathjs");
const {Decimal} = require("decimal.js");

const DVGToken = artifacts.require("DVGToken");
const DAOstake = artifacts.require("DAOstake");
const LPTokenMockup = artifacts.require("LPTokenMockup");

const DVG_IN_ADVANCE = new BN("10000000000000000000");  // 10 DVGs

const PRECISION = new BN("1000000000000000000");  // 1e18
const TRASURY_WALLET_PERCENT = new BN("31000000000000000000");  // 31%
const COMMUNITY_WALLET_PERCENT = new BN("18000000000000000000");  // 18%
const POOL_PERCENT = new BN("51000000000000000000");  // 51%

var dvg, daoStake, lpToken1, lpToken2, startBlock, tx;

contract("DAOstake for success", async (accounts) => {
    const TRASURY_WALLET_ADDRESS = accounts[9];
    const COMMUNITY_WALLET_ADDRESS = accounts[10];

    
    beforeEach(async () => {   
        // LP token 1     
        lpToken1 = await LPTokenMockup.new("LPToken1", "lp1");
        await lpToken1.mint(accounts[1], new BN("1000000000000000000"));
        await lpToken1.mint(accounts[2], new BN("2000000000000000000"));
        // LP token 2
        lpToken2 = await LPTokenMockup.new("LPToken2", "lp2");
        for (i = 1; i < 6; i++) {
            await lpToken2.mint(accounts[i], new BN((1000000000000000000 * i).toString()));
        }
        // LP token 3
        lpToken3 = await LPTokenMockup.new("LPToken3", "lp3");
        // LP token 4
        lpToken4 = await LPTokenMockup.new("LPToken4", "lp4");
        
        dvg = await DVGToken.new(TRASURY_WALLET_ADDRESS, DVG_IN_ADVANCE);

        startBlock = (await time.latestBlock()).toNumber() + 30;
        daoStake = await DAOstake.new(
            startBlock,  // startBlock
            2,  // blockPerPeriod
            TRASURY_WALLET_ADDRESS,  // treasuryWalletAddr
            COMMUNITY_WALLET_ADDRESS,  // communityWalletAddr
            dvg.address,
            PRECISION,  // precision
            TRASURY_WALLET_PERCENT,  // treasuryWalletPercent
            COMMUNITY_WALLET_PERCENT,  // communityWalletPercent
            POOL_PERCENT  // poolPercent
        );
        await expectEvent.inConstruction(daoStake, "SetBlockPeriod", {startBlock:startBlock.toString(), blockPerPeriod:"2"});
        await expectEvent.inConstruction(daoStake, "SetWalletAddress", {treasuryWalletAddr:TRASURY_WALLET_ADDRESS, communityWalletAddr:COMMUNITY_WALLET_ADDRESS});
        await expectEvent.inConstruction(daoStake, "SetDVGAddress", {dvgAddr:dvg.address});
        await expectEvent.inConstruction(daoStake, "SetPrecision", {precision:new BN("1000000000000000000")});
        await expectEvent.inConstruction(daoStake, "SetPercent", {treasuryWalletPercent:TRASURY_WALLET_PERCENT, communityWalletPercent:COMMUNITY_WALLET_PERCENT, poolPercent:POOL_PERCENT});

        assert.equal(await daoStake.startBlock(), startBlock, "The startBlock disagreement");
        assert.equal(await daoStake.blockPerPeriod(), 2, "The blockPerPeriod disagreement");
        assert.equal(await daoStake.treasuryWalletAddr(), TRASURY_WALLET_ADDRESS, "The Treasury wallet address disagreement");
        assert.equal(await daoStake.communityWalletAddr(), COMMUNITY_WALLET_ADDRESS, "The Community wallet address disagreement");
        assert.equal(await daoStake.dvgAddr(), dvg.address, "The DVG address disagreement");
        assert.equal((await daoStake.precision()).toString(), PRECISION, "The precision disagreement");
        assert.equal((await daoStake.hundredPercent()).toString(), PRECISION * 100, "The hundred percent with precision disagreement");
        assert.equal((await daoStake.treasuryWalletPercent()).toString(), TRASURY_WALLET_PERCENT, "The Treasury wallet percent disagreement");        
        assert.equal((await daoStake.communityWalletPercent()).toString(), COMMUNITY_WALLET_PERCENT, "The Community wallet percent disagreement");
        assert.equal((await daoStake.poolPercent()).toString(),POOL_PERCENT, "The pool percent disagreement");
        assert.equal(await daoStake.totalPoolWeight(), 0, "The total pool weight disagreement");

        // mint and distribute 20 DVGs per block in the first period
        tx = await daoStake.setPeriodDVGPerBlock(1, new BN("20000000000000000000"));
        await expectEvent(tx, "SetPeriodDVGPerBlock", {periodId:"1", dvgPerBlock:new BN("20000000000000000000")});
        // mint and distribute 20 * 98% DVGs per block in the second period
        tx = await daoStake.setPeriodDVGPerBlock(2, new BN("19600000000000000000"));
        await expectEvent(tx, "SetPeriodDVGPerBlock", {periodId:"2", dvgPerBlock:new BN("19600000000000000000")});
        // mint and distribute 20 * 98% * 98% DVGs per block in the third period
        tx = await daoStake.setPeriodDVGPerBlock(3, new BN("19208000000000000000"));
        await expectEvent(tx, "SetPeriodDVGPerBlock", {periodId:"3", dvgPerBlock:new BN("19208000000000000000")});
        // mint and distribute 20 * 98% * 98% * 98% DVGs per block in the fourth period
        tx = await daoStake.setPeriodDVGPerBlock(4, new BN("18823840000000000000"));
        await expectEvent(tx, "SetPeriodDVGPerBlock", {periodId:"4", dvgPerBlock:new BN("18823840000000000000")});

        assert.equal((await daoStake.periodDVGPerBlock(1)).toString(), new BN("20000000000000000000"), "The DVG amount per block of period 1 disagreement");
        assert.equal((await daoStake.periodDVGPerBlock(2)).toString(), new BN("19600000000000000000"), "The DVG amount per block of period 2 disagreement");
        assert.equal((await daoStake.periodDVGPerBlock(3)).toString(), new BN("19208000000000000000"), "The DVG amount per block of period 3 disagreement");
        assert.equal((await daoStake.periodDVGPerBlock(4)).toString(), new BN("18823840000000000000"), "The DVG amount per block of period 4 disagreement");

        await dvg.transferOwnership(daoStake.address);
        assert.equal(await dvg.owner(), daoStake.address, "The owner of DVG should be DAOstake");
    });


    it("Should succeed to do setups", async () => {
        const newStartBlock = (await time.latestBlock()).toNumber() + 10;
        tx = await daoStake.setBlockPeriod(newStartBlock, 5);
        await expectEvent(tx, "SetBlockPeriod", {startBlock:newStartBlock.toString(), blockPerPeriod:"5"});
        assert.equal((await daoStake.startBlock()).toNumber(), newStartBlock, "The startBlock number of DAOstake disagreement");
        assert.equal((await daoStake.blockPerPeriod()).toNumber(), 5, "The blockPerPeriod of DAOstake disagreement");

        tx = await daoStake.setWalletAddress(accounts[1], accounts[2]);
        await expectEvent(tx, "SetWalletAddress", {treasuryWalletAddr:accounts[1], communityWalletAddr:accounts[2]});
        assert.equal(await daoStake.treasuryWalletAddr(), accounts[1], "The Treasury wallet address of DAOstake disagreement");
        assert.equal(await daoStake.communityWalletAddr(), accounts[2], "The Community wallet address of DAOstake disagreement");
        
        tx = await daoStake.setDVGAddress(lpToken1.address);
        await expectEvent(tx, "SetDVGAddress", {dvgAddr:lpToken1.address});
        assert.equal(await daoStake.dvgAddr(), lpToken1.address, "The DVG address of DAOstake disagreement");

        tx = await daoStake.setPercent(new BN("15550000000000000000"), new BN("24450000000000000000"), new BN("60000000000000000000"));
        await expectEvent(tx, "SetPercent", {treasuryWalletPercent:new BN("15550000000000000000"), communityWalletPercent:new BN("24450000000000000000"), poolPercent:new BN("60000000000000000000")});
        assert.equal((await daoStake.treasuryWalletPercent()).toString(), new BN("15550000000000000000"), "The Treasury wallet percent of DAOstake disagreement");
        assert.equal((await daoStake.communityWalletPercent()).toString(), new BN("24450000000000000000"), "The Community wallet percent of DAOstake disagreement");
        assert.equal((await daoStake.poolPercent()).toString(), new BN("60000000000000000000"), "The pool percent of DAOstake disagreement");

        tx = await daoStake.setPrecision(1);
        await expectEvent(tx, "SetPrecision", {precision:"1"});
        assert.equal(await daoStake.precision(), 1, "The precision of DAOstake disagreement");

        tx = await daoStake.setPeriodDVGPerBlock(1, 0);
        await expectEvent(tx, "SetPeriodDVGPerBlock", {periodId:"1", dvgPerBlock:"0"});
        assert.equal(await daoStake.periodDVGPerBlock(1), 0, "The DVG amount per block of period 1 disagreement");

        // add 4 new pools (pool 0 -> LP token 1, pool weight 1; pool 1 -> LP token 2, pool weight 2; pool 2 -> LP token 3, pool weight 3; pool 3 -> LP token 4, pool weight 4)
        await daoStake.addPool(lpToken1.address, 1, true);
        await daoStake.addPool(lpToken2.address, 2, true);
        await daoStake.addPool(lpToken3.address, 3, true);
        await daoStake.addPool(lpToken4.address, 4, true);

        tx = await daoStake.setPoolWeight(0, 2, false);
        await expectEvent(tx, "SetPoolWeight", {poolId:"0", poolWeight:"2", totalPoolWeight:"11"});
        assert.equal((await daoStake.pool(0)).poolWeight, 2, "The pool weight of pool 0 disagreement");
        assert.equal(await daoStake.totalPoolWeight(), 11, "The total weight of DAOstake disagreement");
    });

 
    it("Should succeed to add new pools", async () => {
        assert.equal(await daoStake.totalPoolWeight(), 0, "DAOstake should have 0 pool weight when init");

        // add a new pool (pool 0 -> LP token 1, pool weight 1)
        tx = await daoStake.addPool(lpToken1.address, 1, true);
        expectEvent(tx, "AddPool", {lpTokenAddress:lpToken1.address, poolWeight:"1", lastRewardBlock:startBlock.toString()});
        assert.equal(await daoStake.poolLength(), 1, "DAOstake should have 1 pool");
        assert.equal(await daoStake.totalPoolWeight(), 1, "Stake smart contract should have 1 pool weight totally");

        const pool0 = await daoStake.pool(0);
        assert.equal(pool0["lpTokenAddress"], lpToken1.address, "The pool 0 should have correct LP token");
        assert.equal(pool0["poolWeight"], 1, "The pool 0 should have 1 pool weight");
        assert.equal(pool0["lastRewardBlock"], startBlock, "The pool 0 should have correct lastRewardBlock");
        assert.equal(pool0["accDVGPerLP"], 0, "The pool 0 should have 0 accDVGPerLP");

        // add a new pool (pool 1 -> LP token 2, pool weight 2)
        tx = await daoStake.addPool(lpToken2.address, 2, true);
        expectEvent(tx, "AddPool", {lpTokenAddress:lpToken2.address, poolWeight:"2", lastRewardBlock:startBlock.toString()});
        assert.equal(await daoStake.poolLength(), 2, "DAOstake should have 2 pools");
        assert.equal(await daoStake.totalPoolWeight(), 3, "Stake smart contract should have 3 pool weights totally");

        const pool1 = await daoStake.pool(1);
        assert.equal(pool1["lpTokenAddress"], lpToken2.address, "The pool 1 should have correct LP token");
        assert.equal(pool1["poolWeight"], 2, "The pool 1 should have 1 pool weight");
        assert.equal(pool1["lastRewardBlock"], startBlock, "The pool 1 should have correct lastRewardBlock");
        assert.equal(pool1["accDVGPerLP"], 0, "The pool 1 should have 0 accDVGPerLP");
    });


    it("Should succeed to deposit", async () => {
        // add 2 new pools (pool 0 -> LP token 1, pool weight 1; pool 1 -> LP token 2, pool weight 2)
        await daoStake.addPool(lpToken1.address, 1, true);
        await daoStake.addPool(lpToken2.address, 2, true);

        // user 1 deposits some (0.5) LP token 1
        await lpToken1.approve(daoStake.address, new BN("600000000000000000"), {from:accounts[1]});
        tx = await daoStake.deposit(0, new BN("500000000000000000"), {from:accounts[1]});
        expectEvent(tx, "Deposit", {user:accounts[1], poolId:"0", amount:new BN("500000000000000000")});
        assert.equal((await daoStake.user(0, accounts[1])).lpAmount.toString(), new BN("500000000000000000"), "The user 1 should have correct LP token balance in DAOstake");
        assert.equal((await daoStake.user(0, accounts[1])).finishedDVG.toString(), 0, "The user 1 should have correct finished DVG token amount in DAOstake");
        assert.equal((await lpToken1.balanceOf(accounts[1])).toString(), new BN("500000000000000000"), "The user 1 should have correct balance in LP token");
        assert.equal((await lpToken1.allowance(accounts[1], daoStake.address)).toString(), new BN("100000000000000000"), "The DAOstake should have correct allowance from user 1 in LP token");

        // user 2 deposits some (1) LP token 1
        await lpToken1.approve(daoStake.address, new BN("1000000000000000000"), {from:accounts[2]});
        tx = await daoStake.deposit(0, new BN("1000000000000000000"), {from:accounts[2]});
        expectEvent(tx, "Deposit", {user:accounts[2], poolId:"0", amount:new BN("1000000000000000000")});
        assert.equal((await daoStake.user(0, accounts[2])).lpAmount.toString(), new BN("1000000000000000000"), "The user 2 should have correct LP token balance in DAOstake");
        assert.equal((await daoStake.user(0, accounts[2])).finishedDVG.toString(), 0, "The user 2 should have correct finished DVG token amount in DAOstake");
        assert.equal((await lpToken1.balanceOf(accounts[2])).toString(), new BN("1000000000000000000"), "The user 2 should have correct balance in LP token");
        assert.equal((await lpToken1.allowance(accounts[2], daoStake.address)).toString(), 0, "The DAOstake should have correct allowance from user 2 in LP token");
        
        // user 1 deposits some (0.1) LP token 1 again
        tx = await daoStake.deposit(0, new BN("100000000000000000"), {from:accounts[1]});
        expectEvent(tx, "Deposit", {user:accounts[1], poolId:"0", amount:new BN("100000000000000000")});
        assert.equal((await daoStake.user(0, accounts[1])).lpAmount.toString(), new BN("600000000000000000"), "The user 1 should have correct LP token balance in DAOstake");
        assert.equal((await daoStake.user(0, accounts[1])).finishedDVG.toString(), 0, "The user 1 should have correct finished DVG token amount in DAOstake");
        assert.equal((await lpToken1.balanceOf(accounts[1])).toString(), new BN("400000000000000000"), "The user 1 should have correct balance in LP token");
        assert.equal((await lpToken1.allowance(accounts[1], daoStake.address)).toString(), 0, "The DAOstake should have correct allowance from user 1 in LP token");

        // check LP token 1 balance of DAOstake
        assert.equal((await lpToken1.balanceOf(daoStake.address)).toString(), new BN("1600000000000000000"), "The pool 0 should have correct balance in LP token");
    });


    it("Should succeed to withdraw", async () => {
        // add 2 new pools (pool 0 -> LP token 1, pool weight 1; pool 1 -> LP token 2, pool weight 2)
        await daoStake.addPool(lpToken1.address, 1, true);
        await daoStake.addPool(lpToken2.address, 2, true);


        // 2 users deposit some LP token 1 (user 1 -> 0.6, user 2 -> 1)
        await lpToken1.approve(daoStake.address, new BN("600000000000000000"), {from:accounts[1]});
        await daoStake.deposit(0, new BN("600000000000000000"), {from:accounts[1]});
        await lpToken1.approve(daoStake.address, new BN("1000000000000000000"), {from:accounts[2]});
        await daoStake.deposit(0, new BN("1000000000000000000"), {from:accounts[2]});

        // user 1 withdraws some (0.5) LP token 1
        tx = await daoStake.withdraw(0, new BN("500000000000000000"), {from:accounts[1]});
        expectEvent(tx, "Withdraw", {user:accounts[1], poolId:"0", amount:new BN("500000000000000000")});
        assert.equal((await daoStake.user(0, accounts[1])).lpAmount.toString(), new BN("100000000000000000"), "The user 1 should have correct LP token balance in DAOstake");
        assert.equal((await lpToken1.balanceOf(accounts[1])).toString(), new BN("900000000000000000"), "The user 1 should have correct balance in LP token");

        // user 2 withdraws all (1) LP token 1
        tx = await daoStake.withdraw(0, new BN("1000000000000000000"), {from:accounts[2]});
        expectEvent(tx, "Withdraw", {user:accounts[2], poolId:"0", amount:new BN("1000000000000000000")});
        assert.equal((await daoStake.user(0, accounts[2])).lpAmount.toString(), 0, "The user 2 should have correct LP token balance in DAOstake");
        assert.equal((await lpToken1.balanceOf(accounts[2])).toString(), new BN("2000000000000000000"), "The user 1 should have correct balance in LP token smart contract");

        // user 1 withdraws remaining (0.1) LP token 1
        tx = await daoStake.withdraw(0, new BN("100000000000000000"), {from:accounts[1]});
        expectEvent(tx, "Withdraw", {user:accounts[1], poolId:"0", amount:new BN("100000000000000000")});
        assert.equal((await daoStake.user(0, accounts[1])).lpAmount.toString(), 0, "The user 1 should have correct LP token balance in DAOstake");
        assert.equal((await lpToken2.balanceOf(accounts[1])).toString(), new BN("1000000000000000000"), "The user 1 should have correct balance in LP token smart contract");
        
        // check LP token 1 balance of DAOstake
        assert.equal((await lpToken1.balanceOf(daoStake.address)).toString(), 0, "The pool 0 should have correct balance in LP token");

        // user 1 deposits 0.1 LP token 1 again
        await lpToken1.approve(daoStake.address, new BN("100000000000000000"), {from:accounts[1]});
        tx = await daoStake.deposit(0, new BN("100000000000000000"), {from:accounts[1]});
        expectEvent(tx, "Deposit", {user:accounts[1], poolId:"0", amount:new BN("100000000000000000")});
        assert.equal((await daoStake.user(0, accounts[1])).lpAmount.toString(), new BN("100000000000000000"), "The user 1 should have correct LP token balance in DAOstake");
        assert.equal((await lpToken1.balanceOf(accounts[1])).toString(), new BN("900000000000000000"), "The user 1 should have correct balance in LP token");
        
        // check LP token 1 balance of DAOstake
        assert.equal((await lpToken1.balanceOf(daoStake.address)).toString(), new BN("100000000000000000"), "The pool 0 should have correct balance in LP token");
    });

    
    it("Should succeed to emergency withdraw", async () => {
        // add 1 new pool (pool 0 -> LP token 1, pool weight 1)
        await daoStake.addPool(lpToken1.address, 1, true);

        // user 1 deposits some (0.5) LP token 1 
        await lpToken1.approve(daoStake.address, new BN("600000000000000000"), {from:accounts[1]});
        await daoStake.deposit(0, new BN("500000000000000000"), {from:accounts[1]});
        assert.equal((await lpToken1.balanceOf(accounts[1])).toString(), new BN("500000000000000000"), "The user 1 should have correct balance in LP token");
        assert.equal((await daoStake.user(0, accounts[1])).lpAmount.toString(), new BN("500000000000000000"), "The user 1 should have correct LP token balance in DAOstake");

        // user 1 emergency withdraws LP token 1 
        tx = await daoStake.emergencyWithdraw(0, {from:accounts[1]});
        expectEvent(tx, "EmergencyWithdraw", {user:accounts[1], poolId:"0", amount:new BN("500000000000000000")});
        assert.equal((await lpToken1.balanceOf(accounts[1])).toString(), new BN("1000000000000000000"), "The user 1 should have correct balance in LP token");
        assert.equal((await daoStake.user(0, accounts[1])).lpAmount, 0, "The user 1 should have correct LP token balance in DAOstake");
        assert.equal((await daoStake.user(0, accounts[1])).finishedDVG, 0, "The user 1 should have zero finished DVG amount in DAOstake");
    });


  
    it("Should record and store the distributeion of DVGs properly", async () => {
        // add 4 new pools (pool 0 -> LP token 1, pool weight 1; pool 1 -> LP token 2, pool weight 2; pool 2 -> LP token 3, pool weight 3; pool 3 -> LP token 4, pool weight 4)
        await daoStake.addPool(lpToken1.address, 1, true);
        await daoStake.addPool(lpToken2.address, 2, true);
        await daoStake.addPool(lpToken3.address, 3, true);
        await daoStake.addPool(lpToken4.address, 4, true);

        // 2 users deposit LP token 1 (user 1 -> 0.5, user 2 -> 1)
        await lpToken1.approve(daoStake.address, new BN("500000000000000000"), {from:accounts[1]});
        await daoStake.deposit(0, new BN("500000000000000000"), {from:accounts[1]});
        await lpToken1.approve(daoStake.address, new BN("1000000000000000000"), {from:accounts[2]});
        await daoStake.deposit(0, new BN("1000000000000000000"), {from:accounts[2]});

        // 5 users deposit LP token 2 (user 1 -> 0.5, user 2 -> 1, user 3 -> 1.5, user 4 -> 2, user 5 -> 2.5)
        for (i = 1; i < 6; i++) {
            await lpToken2.approve(daoStake.address, new BN((500000000000000000 * i).toString()), {from:accounts[i]});
            await daoStake.deposit(1, new BN((500000000000000000 * i).toString()), {from:accounts[i]});
        }

        await time.advanceBlockTo(startBlock);

        tx = await daoStake.massUpdatePools();
        for (i = 0; i < 4; i++) {
            expectEvent(tx, "UpdatePool", {poolId:i.toString(), lastRewardBlock:(startBlock + 1).toString(), totalDVG:new BN((2000000000000000000 * (i + 1)).toString())});
        }
        
        // amountForTreasuryWallet: 20(dvgPerBlock) * 31%(treasuryWalletPercent) + 10(dvgInAdvance) = 16.2
        assert.equal((await dvg.balanceOf(TRASURY_WALLET_ADDRESS)).toString(), new BN("16200000000000000000"), "The Treasury wallet should have correct balance of DVG");
        
        // amountForCommunityWallet: because pool 3 and pool 4 have no user/LP token, so the DVGs distribuited to them will be distributed to Community wallet 
        // 20(dvgPerBlock) * 18%(communityWalletPercent) + 
        // 20(dvgPerBlock) * 51%(poolPercent) * (3/10)(pool2Weight/totalWeight) + 
        // 20(dvgPerBlock) * 51%(poolPercent) * (4/10)(pool3Weight/totalWeight) = 10.74
        assert.equal((await dvg.balanceOf(COMMUNITY_WALLET_ADDRESS)).toString(), new BN("10740000000000000000"), "The Community wallet should have correct balance of DVG");

        // amountForPool: 20(dvgPerBlock) * 51%(poolPercent) * (1/10)(pool0Weight/totalWeight) + 20(dvgPerBlock) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) = 3.06
        assert.equal((await dvg.balanceOf(daoStake.address)).toString(), new BN("3060000000000000000"), "The DAOstake should have correct balance of DVG"); 

        await time.advanceBlockTo(startBlock + 3);

        // pending DVG amount for user 1 from pool 0:
        // 2(blockLength) * 20(dvgPerBlockOfPeriod1) * 51%(poolPercent) * (1/10)(pool0Weight/totalWeight) * (0.5/1.5)(lpToken/totalLPToken) +
        // 1(blockLength) * 19.6(dvgPerBlockOfPeriod2) * 51%(poolPercent) * (1/10)(pool0Weight/totalWeight) * (0.5/1.5)(lpToken/totalLPToken) = 1.0132
        // pending DVG amount for user 1 from pool 1:
        // 2(blockLength) * 20(dvgPerBlockOfPeriod1) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * (0.5/7.5)(lpToken/totalLPToken) +
        // 1(blockLength) * 19.6(dvgPerBlockOfPeriod2) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * (0.5/7.5)(lpToken/totalLPToken) = 0.40528
        // total pending DVG amount for user 1:
        // 1.0132(amount from pool 0) + 0.40528(amount from pool 1) = 1.41848
        assert.equal(Decimal.add((await daoStake.pendingDVG(0, accounts[1])).toString()/1e18, (await daoStake.pendingDVG(1, accounts[1])).toString()/1e18), 1.41848, "The user 1 should have correct pending DVG amount in DAOstake");

        // pending DVG amount for user 2 from pool 0:
        // 2(blockLength) * 20(dvgPerBlockOfPeriod1) * 51%(poolPercent) * (1/10)(pool0Weight/totalWeight) * (1/1.5)(lpToken/totalLPToken) +
        // 1(blockLength) * 19.6(dvgPerBlockOfPeriod2) * 51%(poolPercent) * (1/10)(pool0Weight/totalWeight) * (1/1.5)(lpToken/totalLPToken) = 2.0264
        // pending DVG amount for user 2 from pool 1:
        // 2(blockLength) * 20(dvgPerBlockOfPeriod1) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * (1/7.5)(lpToken/totalLPToken) +
        // 1(blockLength) * 19.6(dvgPerBlockOfPeriod2) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * (1/7.5)(lpToken/totalLPToken) = 0.81056
        // total pending DVG amount for user 2:
        // 2.0264(amount from pool 0) + 0.81056(amount from pool 1) = 2.83696
        assert.equal(Decimal.add((await daoStake.pendingDVG(0, accounts[2])).toString()/1e18, (await daoStake.pendingDVG(1, accounts[2])).toString()/1e18), 2.83696, "The user 2 should have correct pending DVG amount in DAOstake");
        
        // pending DVG amount for user 3 from pool 1:
        // 2(blockLength) * 20(dvgPerBlockOfPeriod1) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * (1.5/7.5)(lpToken/totalLPToken) +
        // 1(blockLength) * 19.6(dvgPerBlockOfPeriod2) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * (1.5/7.5)(lpToken/totalLPToken) = 1.21584
        assert.equal((await daoStake.pendingDVG(1, accounts[3])).toString()/1e18, 1.21584, "The user 3 should have correct pending DVG amount in DAOstake");

        // pending DVG amount for user 4 from pool 1:
        // 2(blockLength) * 20(dvgPerBlockOfPeriod1) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * (2/7.5)(lpToken/totalLPToken) +
        // 1(blockLength) * 19.6(dvgPerBlockOfPeriod2) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * (2/7.5)(lpToken/totalLPToken) = 1.62112
        assert.equal((await daoStake.pendingDVG(1, accounts[4])).toString()/1e18, 1.62112, "The user 4 should have correct pending DVG amount in DAOstake");

        // pending DVG amount for user 5 from pool 1:
        // 2(blockLength) * 20(dvgPerBlockOfPeriod1) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * (2.5/7.5)(lpToken/totalLPToken) +
        // 1(blockLength) * 19.6(dvgPerBlockOfPeriod2) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * (2.5/7.5)(lpToken/totalLPToken) = 2.0264
        assert.equal((await daoStake.pendingDVG(1, accounts[5])).toString()/1e18, 2.0264, "The user 5 should have correct pending DVG amount in DAOstake");

        // check the lastRewardBlock number of each pool
        for (i = 0; i < (await daoStake.poolLength()).toNumber(); i++) {
            assert.equal(((await daoStake.pool(i)).lastRewardBlock).toNumber(), startBlock + 1, "The pool should have correct lastRewardBlock number");
        }
    });


    it("Should mint and distribute DVGs to stakers properly when they deposit or withdraw", async () => {
        // add 4 new pools (pool 0 -> LP token 1, pool weight 1; pool 1 -> LP token 2, pool weight 2; pool 2 -> LP token 3, pool weight 3; pool 3 -> LP token 4, pool weight 4)
        await daoStake.addPool(lpToken1.address, 1, true);
        await daoStake.addPool(lpToken2.address, 2, true);
        await daoStake.addPool(lpToken3.address, 3, true);
        await daoStake.addPool(lpToken4.address, 4, true);

        // 2 users deposit LP token 1 (user 1 -> 0.5, user 2 -> 1)
        await lpToken1.approve(daoStake.address, new BN("500000000000000000"), {from:accounts[1]});
        await daoStake.deposit(0, new BN("500000000000000000"), {from:accounts[1]});
        await lpToken1.approve(daoStake.address, new BN("1000000000000000000"), {from:accounts[2]});
        await daoStake.deposit(0, new BN("1000000000000000000"), {from:accounts[2]});

        // 5 users deposit LP token 2 (user 1 -> 0.5, user 2 -> 1, user 3 -> 1.5, user 4 -> 2, user 5 -> 2.5)
        for (i = 1; i < 6; i++) {
            await lpToken2.approve(daoStake.address, new BN((500000000000000000 * i).toString()), {from:accounts[i]});
            await daoStake.deposit(1, new BN((500000000000000000 * i).toString()), {from:accounts[i]});
        }

        await time.advanceBlockTo(startBlock);

        await daoStake.massUpdatePools();
        
        // amountForTreasuryWallet: 20(dvgPerBlock) * 31%(treasuryWalletPercent) + 10(dvgInAdvance) = 16.2
        assert.equal((await dvg.balanceOf(TRASURY_WALLET_ADDRESS)).toString(), new BN("16200000000000000000"), "The Treasury wallet should have correct balance of DVG");
        
        // amountForCommunityWallet: because pool 3 and pool 4 have no user/LP token, so the DVGs distribuited to them will be distributed to Community wallet 
        // 20(dvgPerBlock) * 18%(communityWalletPercent) + 
        // 20(dvgPerBlock) * 51%(poolPercent) * (3/10)(pool2Weight/totalWeight) + 
        // 20(dvgPerBlock) * 51%(poolPercent) * (4/10)(pool3Weight/totalWeight) = 10.74
        assert.equal((await dvg.balanceOf(COMMUNITY_WALLET_ADDRESS)).toString(), new BN("10740000000000000000"), "The Community wallet should have correct balance of DVG");

        // amountForPool: 20(dvgPerBlock) * 51%(poolPercent) * (1/10)(pool0Weight/totalWeight) + 20(dvgPerBlock) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) = 3.06
        assert.equal((await dvg.balanceOf(daoStake.address)).toString(), new BN("3060000000000000000"), "The DAOstake should have correct balance of DVG"); 

        await time.advanceBlockTo(startBlock + 3);

        for (i = 1; i < 6; i++) {
            assert.equal(await dvg.balanceOf(accounts[i]), 0, `Should not mint and distribute DVGs to user ${i} if no deposit or withdrawal`);
        }

        tx = await daoStake.deposit(0, 0, {from:accounts[1]});
        expectEvent(tx, "Deposit", {user:accounts[1], poolId:"0", amount:"0"});
        // DVG amount for user 1 from pool 0:
        // 2(blockLength) * 20(dvgPerBlockOfPeriod1) * 51%(poolPercent) * (1/10)(pool0Weight/totalWeight) * (0.5/1.5)(lpToken/totalLPToken) +
        // 2(blockLength) * 19.6(dvgPerBlockOfPeriod2) * 51%(poolPercent) * (1/10)(pool0Weight/totalWeight) * (0.5/1.5)(lpToken/totalLPToken) = 1.3464
        assert.equal((await dvg.balanceOf(accounts[1])).toString()/1e18, 1.3464, "Should mint and distribute DVGs to user 1 properly if he dposits to pool 0");
        assert.equal(((await daoStake.user(0, accounts[1])).finishedDVG).toString()/1e18, 1.3464, "User 1 should have correct finished DVG amount in pool 0");

        tx = await daoStake.withdraw(1, new BN("500000000000000000"), {from:accounts[1]});
        expectEvent(tx, "Withdraw", {user:accounts[1], poolId:"1", amount:new BN("500000000000000000")});
        // DVG amount for user 1 from pool 1:
        // 2(blockLength) * 20(dvgPerBlockOfPeriod1) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * (0.5/7.5)(lpToken/totalLPToken) +
        // 2(blockLength) * 19.6(dvgPerBlockOfPeriod2) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * (0.5/7.5)(lpToken/totalLPToken) + 
        // 1(blockLength) * 19.208(dvgPerBlockOfPeriod3) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * (0.5/7.5)(lpToken/totalLPToken) = 0.6691744
        // 0.6691744(amount from pool 1) + 1.3464(amount from pool 0) = 2.0155744
        assert.equal((await dvg.balanceOf(accounts[1])).toString()/1e18, 2.0155744, "Should mint and distribute DVGs to user 1 properly if he withdraws from pool 1");
        assert.equal(((await daoStake.user(1, accounts[1])).finishedDVG).toString()/1e18, 0, "User 1 should have correct finished DVG amount in pool 1");
        tx = await daoStake.deposit(1, 0, {from:accounts[1]});
        expectEvent(tx, "Deposit", {user:accounts[1], poolId:"1", amount:"0"});
        assert.equal((await dvg.balanceOf(accounts[1])).toString()/1e18, 2.0155744, "Should not mint and distribute more DVGs to user 1 because he has withdrawn all from pool 1");
        
        // pending DVG amount for user 1 in the third period from pool 0:
        // 2(blockLength) * 19.208(dvgPerBlockOfPeriod3) * 51%(poolPercent) * (1/10)(pool0Weight/totalWeight) * (0.5/1.5)(lpToken/totalLPToken) = 0.653072
        assert.equal((await daoStake.pendingDVG(0, accounts[1])).toString()/1e18, 0.653072, "The user 1 should have correct pending DVG amount from pool 0 in DAOstake");

        for (i = 2; i <= 5; i++) {
            assert.equal((await dvg.balanceOf(accounts[i])).toString()/1e18, 0, `Should not mint and distribute DVGs to user ${i} if no deposit or withdrawal`);
            assert.equal((await dvg.balanceOf(accounts[i])).toString()/1e18, 0, `The finished DVG amount of user ${i} should be zero`);
            // 20(dvgPerBlockOfPeriod1) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * 0.5 * i * (2 * 1 + 2 * 98% + 98% * 98%) / 7.5 
            // + 20(dvgPerBlockOfPeriod1) * 51%(poolPercent) * (2/10)(pool1Weight/totalWeight) * 0.5 * i * 98% * 98% / 7 = 0.8091184 * i
            assert.equal((await daoStake.pendingDVG(1, accounts[i])).toString()/1e18, (8091184 * i)/1e7, `The user ${i} should have correct pending DVG amount from pool 1 in DAOstake`);
        }

        // DVG amount for Treasury wallet:
        // pool 0: 20(dvgPerBlockOfPeriod1) * 31%(treasuryWalletPercent) * (1/10)(pool0Weight/totalWeight) 
        // + 2(blockLength) * 19.6(dvgPerBlockOfPeriod2) * 31%(treasuryWalletPercent) * (1/10)(pool0Weight/totalWeight) = 1.8352
        // pool 1: 20(dvgPerBlockOfPeriod1) * 31%(treasuryWalletPercent) * (2/10)(pool1Weight/totalWeight) 
        // + 2(blockLength) * 19.6(dvgPerBlockOfPeriod2) * 31%(treasuryWalletPercent) * (2/10)(pool1Weight/totalWeight) 
        // + 2(blockLength) * 19.208(dvgPerBlockOfPeriod3) * 31%(treasuryWalletPercent) * (2/10)(pool1Weight/totalWeight) = 6.052192
        // 16.2 + 1.8352 + 6.052192 = 24.087392
        assert.equal((await dvg.balanceOf(TRASURY_WALLET_ADDRESS)).toString(), new BN("24087392000000000000"), "The Treasury wallet should have correct balance of DVG");

        tx = await daoStake.updatePool(2);
        expectEvent(tx, "UpdatePool", {poolId:"2", lastRewardBlock:(startBlock + 7).toString(), totalDVG:new BN("34931952000000000000")});
        // DVG amount for Community wallet:
        // pool 0: 20(dvgPerBlockOfPeriod1) * 18%(communityWalletPercent) * (1/10)(pool0Weight/totalWeight) 
        // + 2(blockLength) * 19.6(dvgPerBlockOfPeriod2) * 18%(communityWalletPercent) * (1/10)(pool0Weight/totalWeight) = 1.0656
        // pool 1: 20(dvgPerBlockOfPeriod1) * 18%(communityWalletPercent) * (2/10)(pool1Weight/totalWeight) 
        // + 2(blockLength) * 19.6(dvgPerBlockOfPeriod2) * 18%(communityWalletPercent) * (2/10)(pool1Weight/totalWeight) 
        // + 2(blockLength) * 19.208(dvgPerBlockOfPeriod3) * 18%(communityWalletPercent) * (2/10)(pool1Weight/totalWeight) = 3.514176
        // pool 2: 20(dvgPerBlockOfPeriod1) * (18%(communityWalletPercent) + 51%(poolPercent)) * (3/10)(pool2Weight/totalWeight) 
        // + 2(blockLength) * 19.6(dvgPerBlockOfPeriod2) * (18%(communityWalletPercent) + 51%(poolPercent)) * (3/10)(pool2Weight/totalWeight) 
        // + 2(blockLength) * 19.208(dvgPerBlockOfPeriod3) * (18%(communityWalletPercent) + 51%(poolPercent)) * (3/10)(pool2Weight/totalWeight)
        // + 18.82384(dvgPerBlockOfPeriod4) * (18%(communityWalletPercent) + 51%(poolPercent)) * (3/10)(pool2Weight/totalWeight) = 24.10304688
        // 10.74 + 1.0656 + 3.514176 + 24.10304688 = 39.42282288
        assert.equal((await dvg.balanceOf(COMMUNITY_WALLET_ADDRESS)).toString(), new BN("39422822880000000000"), "The Community wallet should have correct balance of DVG");
    });


});