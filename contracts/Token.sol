//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.9;

import "hardhat/console.sol";

contract Token {
    string public name = "My Hardhat Token";
    string public symbol = "MHT";

    uint256 public totalSupply = 1000000;

    address public owner;

    mapping(address => uint256) balances;

    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    constructor() {
        // このコントラクトをデプロイした人に全てのTokenが割り当てられる
        balances[msg.sender] = totalSupply;
        // コントラクトのオーナーをデプロイした人にする
        owner = msg.sender;
    }

    function transfer(address to, uint256 amount) external {
        require(balances[msg.sender] >= amount, "Not enough tokens");

        console.log(
            "Transferring from %s to %s %s tokens",
            msg.sender,
            to,
            amount
        );

        // お金を送る
        balances[msg.sender] -= amount;
        balances[to] += amount;

        // フロントにお金を送ったことの完了イベントを伝える
        emit Transfer(msg.sender, to, amount);
    }

    /**
     * 指定のアドレスのお金を表示する
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
}