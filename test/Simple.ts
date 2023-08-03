import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("SimpleContract", function () {
  let Owner: Contract;
  let Alice: Contract;
  let Bob: Contract;
  let Charlie: Contract;
  let simpleContract: Contract;

  before(async function () {
    const SimpleContract = await ethers.getContractFactory("SimpleContract");
    simpleContract = await SimpleContract.deploy();
    //await simpleContract.deployTransaction.wait();

    [Owner, Alice, Bob, Charlie] = await ethers.getSigners();
  });

  it("Should deploy SimpleContract", async function () {
    expect(await simpleContract.getAddress()).to.be.properAddress;
  });

  describe("getInt256", function () {
    it("Should return the correct value", async function () {
      expect(await simpleContract.getInt256()).to.equal(0);
    });
  });

  describe("setInt256", function () {
    it("Should set the correct value", async function () {
      await simpleContract.setInt256(42);
      expect(await simpleContract.getInt256()).to.equal(42);
    });
  });
});
