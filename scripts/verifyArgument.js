require("dotenv").config();

/**
 * verify時のコントラクトのコンストラクタの引数
 */
module.exports = [
  'HollandGene',
  'HG',
  process.env.IPFS_METADATA_URL,
  process.env.IPFS_METADATA_NOT_REVEALED_URL
];
