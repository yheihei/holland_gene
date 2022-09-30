const { ethers } = require("hardhat");
const config = require('../frontend/public/config/config.json')
const contractAbi = require("../frontend/public/config/abi.json");

require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("deployer address:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const nftContract = new ethers.Contract(
    config.CONTRACT_ADDRESS,
    contractAbi,
    deployer
  )
  console.log("contract address:", nftContract.address);
  // 任意のsaleにしておく
  await nftContract.setPhase(1);
  console.log(await nftContract.phase());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
