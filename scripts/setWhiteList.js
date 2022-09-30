const { ethers } = require("hardhat");
const config = require('../frontend/public/config/config.json')
const contractAbi = require("../frontend/public/config/abi.json");

const { MerkleTree } = require('merkletreejs')
const { keccak256 } = require('@ethersproject/keccak256')

require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("deployer address:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log(`White List: ${config.WHITELIST}`)

  const nftContract = new ethers.Contract(
    config.CONTRACT_ADDRESS,
    contractAbi,
    deployer
  )
  console.log("contract address:", nftContract.address);
  console.log("merkleRoot:", await nftContract.merkleRoot())
  const leaves = config.WHITELIST.map((x) =>
      keccak256(x)
  )
  // WL登録
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
  rootTree = tree.getRoot()
  await nftContract.setMerkleRoot(rootTree)
  console.log("after merkleRoot:", await nftContract.merkleRoot())
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
