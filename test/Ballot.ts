import { ethers } from "hardhat";
import { Contract, Signer, encodeBytes32String, decodeBytes32String } from "ethers";
import { expect } from "chai";
import { Ballot } from "../typechain-types";

describe("Ballot Contract", function () {
  let Ballot: Ballot;
  let Owner: Signer;
  let Alice: Signer;
  let Bob: Signer;
  let Charlie: Signer;
  let ownerAddress: string;
  let aliceAddress: string;
  let bobAddress: string;
  let charlieAddress: string;
  const proposalNames = [encodeBytes32String("Proposal1"), encodeBytes32String("Proposal2")];

  beforeEach(async function () {
    [Owner, Alice, Bob, Charlie] = await ethers.getSigners();
    ownerAddress = await Owner.getAddress();
    aliceAddress = await Alice.getAddress();
    bobAddress = await Bob.getAddress();
    charlieAddress = await Charlie.getAddress();

    const BallotFactory = await ethers.getContractFactory("Ballot");
    Ballot = await BallotFactory.deploy(proposalNames) as Ballot;
    await Ballot.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct address", async function () {
      expect(await Ballot.getAddress()).to.be.properAddress;
    });

    it("Should set the correct owner", async function () {
      expect(await Ballot.chairperson()).to.equal(ownerAddress);
    });
  });

  describe("giveRightToVote()", function () {
    it("Should give right to vote to a voter by chairperson", async function () {
      await Ballot.connect(Owner).giveRightToVote(aliceAddress);
      const voter = await Ballot.voters(aliceAddress);
      expect(voter.weight).to.equal(1);
    });

    it("Should revert if called by someone other than chairperson", async function () {
      await expect(Ballot.connect(Alice).giveRightToVote(bobAddress)).to.be.revertedWith("Only chairperson can give right to vote.");
    });

    it("Should revert if the voter has already voted", async function () {
      await Ballot.connect(Owner).giveRightToVote(aliceAddress);
      await Ballot.connect(Alice).vote(0);
      await expect(Ballot.connect(Owner).giveRightToVote(aliceAddress)).to.be.revertedWith("The voter already voted.");
    });

    it("Should revert if the voter already has a weight", async function () {
      await Ballot.connect(Owner).giveRightToVote(aliceAddress);
      await expect(Ballot.connect(Owner).giveRightToVote(aliceAddress)).to.be.reverted;
    });
  });

  describe("delegate()", function () {
    beforeEach(async function () {
      await Ballot.connect(Owner).giveRightToVote(aliceAddress);
      await Ballot.connect(Owner).giveRightToVote(bobAddress);
    });

    it("Should delegate vote correctly", async function () {
      await Ballot.connect(Alice).delegate(bobAddress);
      const alice = await Ballot.voters(aliceAddress);
      const bob = await Ballot.voters(bobAddress);
      expect(alice.delegate).to.equal(bobAddress);
      expect(bob.weight).to.equal(2);
    });

    it("Should revert if voter has no right to vote", async function () {
      await expect(Ballot.connect(Charlie).delegate(bobAddress)).to.be.revertedWith("You have no right to vote");
    });

    it("Should revert on self-delegation", async function () {
      await expect(Ballot.connect(Alice).delegate(aliceAddress)).to.be.revertedWith("Self-delegation is disallowed.");
    });

    it("Should revert on loop in delegation", async function () {
      await Ballot.connect(Alice).delegate(bobAddress);
      await expect(Ballot.connect(Bob).delegate(aliceAddress)).to.be.revertedWith("Found loop in delegation.");
    });

    it("Should revert if delegatee has no right to vote", async function () {
      await expect(Ballot.connect(Alice).delegate(charlieAddress)).to.be.reverted;
    });
  });

  describe("vote()", function () {
    beforeEach(async function () {
      await Ballot.connect(Owner).giveRightToVote(aliceAddress);
    });

    it("Should vote for a proposal correctly", async function () {
      await Ballot.connect(Alice).vote(0);
      const proposal = await Ballot.proposals(0);
      expect(proposal.voteCount).to.equal(1);
    });

    it("Should revert if voter has no right to vote", async function () {
      await expect(Ballot.connect(Bob).vote(0)).to.be.revertedWith("Has no right to vote");
    });

    it("Should revert if voter has already voted", async function () {
      await Ballot.connect(Alice).vote(0);
      await expect(Ballot.connect(Alice).vote(1)).to.be.revertedWith("Already voted.");
    });

    it("Should revert if voting for out of range proposal", async function () {
      await expect(Ballot.connect(Alice).vote(99)).to.be.reverted;
    });
  });

  describe("winningProposal()", function () {
    beforeEach(async function () {
      await Ballot.connect(Owner).giveRightToVote(aliceAddress);
      await Ballot.connect(Owner).giveRightToVote(bobAddress);
      await Ballot.connect(Alice).vote(0);
      await Ballot.connect(Bob).vote(1);
    });

    it("Should compute the winning proposal correctly", async function () {
      const winningProposalIndex = await Ballot.winningProposal();
      expect(winningProposalIndex).to.equal(0);
    });
  });

  describe("winnerName()", function () {
    beforeEach(async function () {
      await Ballot.connect(Owner).giveRightToVote(aliceAddress);
      await Ballot.connect(Alice).vote(0);
    });

    it("Should return the name of the winner correctly", async function () {
      const winnerName = await Ballot.winnerName();
      expect(decodeBytes32String(winnerName)).to.equal("Proposal1");
    });
  });
});
