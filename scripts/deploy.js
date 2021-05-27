// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const BN = require('bn.js');

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile 
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const DVGToken = await hre.ethers.getContractFactory("DVGToken");
  const dvg = await DVGToken.deploy("Your account address", new BN("The amount of DVGs minted in advance").toString());

  await dvg.deployed();

  console.log("DVG token smart contract address:", dvg.address);
  console.log("DVG token name:", await dvg.name());
  console.log("DVG token symbol:", await dvg.symbol());
  console.log("DVG token decimals:", await dvg.decimals());
  console.log("DVG token total supply:", (await dvg.totalSupply()).toString());
  console.log("DVG token amount of account:", (await dvg.balanceOf("Your account address")).toString());

  const DAOstake = await hre.ethers.getContractFactory("DAOstake");
  const stake = await DAOstake.deploy("0x59E83877bD248cBFe392dbB5A8a29959bcb48592", "0xdd6c35aFF646B2fB7d8A8955Ccbe0994409348d0", dvg.address);
  await stake.deployed();

  console.log("DAOstake smart contract address:", stake.address);


  // const AnyDVGWrapper = await hre.ethers.getContractFactory("AnyDVGWrapper");
  // const dvgWrapper = await AnyDVGWrapper.deploy(dvg.address, "MPC address");

  // await dvgWrapper.deployed();

  // console.log("AnyDVGWrapper smart contract address:", dvgWrapper.address);
  // console.log("AnyDVGWrapper name:", await dvgWrapper.name());
  // console.log("AnyDVGWrapper symbol:", await dvgWrapper.symbol());
  // console.log("AnyDVGWrapper decimals:", await dvgWrapper.decimals());
  // console.log("AnyDVGWrapper DVG token:", await dvgWrapper.underlying());
  // console.log("AnyDVGWrapper vault:", await dvgWrapper.vault());

  // await dvg.addMinter(dvgWrapper.address);
  // console.log("DVG token minters:", await dvg.getAllMinters());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
