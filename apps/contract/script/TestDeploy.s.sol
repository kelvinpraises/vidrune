// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

contract SimpleTest {
    uint256 public value;
    
    constructor() {
        value = 42;
    }
}

contract TestDeploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        SimpleTest test = new SimpleTest();
        console.log("SimpleTest deployed at:", address(test));
        
        vm.stopBroadcast();
    }
}
