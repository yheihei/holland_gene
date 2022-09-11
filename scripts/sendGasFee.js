require("dotenv").config();

/**
 * テスト用のウォレットにETHを送信する
 * npx hardhat run scripts/sendGasFee.js --network localhost
 */
async function main() {
  const transactionSend = {
    // 送信先アドレス
    to: process.env.SEND_GAS_FEE_TARGET_ADDRESS,
    value: ethers.utils.parseEther("10.0"),
  };

  const [account] = await ethers.getSigners();
  await account.sendTransaction(transactionSend);
  console.log("success");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
