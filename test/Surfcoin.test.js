import assertRevert from '../helpers/assertRevert';
import expectThrow from '../helpers/expectThrow';
import ether from '../helpers/ether';
import { inLogs } from '../helpers/expectEvent';

const BigNumber = web3.BigNumber;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();


const Surfcoin = artifacts.require('Surfcoin');


contract('BaseToken', function ([_, owner, recipient, anotherAccount]) {

  beforeEach(async function () {
    this.token = await Surfcoin.new(100);
    let result = await this.token.mint(owner, 100);
  });

  describe('total supply', function () {
    it('returns the total amount of tokens', async function () {
      const totalSupply = await this.token.totalSupply();

      assert.equal(totalSupply, 100);
    });
  });

  describe('balanceOf', function () {
    describe('when the requested account has no tokens', function () {
      it('returns zero', async function () {
        const balance = await this.token.balanceOf(anotherAccount);

        assert.equal(balance, 0);
      });
    });

    describe('when the requested account has some tokens', function () {
      it('returns the total amount of tokens', async function () {
        const balance = await this.token.balanceOf(owner);

        assert.equal(balance, 100);
      });
    });
  });

  describe('transfer', function () {
    describe('when the recipient is not the zero address', function () {
      const to = recipient;

      describe('when the sender does not have enough balance', function () {
        const amount = 101;

        it('reverts', async function () {
          await assertRevert(this.token.transfer(to, amount, { from: owner }));
        });
      });

      describe('when the sender has enough balance', function () {
        const amount = 100;

        it('transfers the requested amount', async function () {
          await this.token.transfer(to, amount, { from: owner });

          const senderBalance = await this.token.balanceOf(owner);
          assert.equal(senderBalance, 0);

          const recipientBalance = await this.token.balanceOf(to);
          assert.equal(recipientBalance, amount);
        });

        it('emits a transfer event', async function () {
          const { logs } = await this.token.transfer(to, amount, { from: owner });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Transfer');
          assert.equal(logs[0].args.from, owner);
          assert.equal(logs[0].args.to, to);
          assert(logs[0].args.value.eq(amount));
        });
      });
    });

    describe('when the recipient is the zero address', function () {
      const to = ZERO_ADDRESS;

      it('reverts', async function () {
        await assertRevert(this.token.transfer(to, 100, { from: owner }));
      });
    });
  });
});


contract('Mintable', function ([owner, anotherAccount]) {
  beforeEach(async function () {
    const cap = web3.toWei(100, "ether");
    this.token = await Surfcoin.new(cap, { from: owner });
  });

  describe('minting finished', function () {
    describe('when the token is not finished', function () {
      it('returns false', async function () {
        const mintingFinished = await this.token.mintingFinished();
        assert.equal(mintingFinished, false);
      });
    });

    describe('when the token is finished', function () {
      beforeEach(async function () {
        await this.token.finishMinting({ from: owner });
      });

      it('returns true', async function () {
        const mintingFinished = await this.token.mintingFinished.call();
        assert.equal(mintingFinished, true);
      });
    });
  });

  describe('finish minting', function () {
    describe('when the sender is the token owner', function () {
      const from = owner;

      describe('when the token was not finished', function () {
        it('finishes token minting', async function () {
          await this.token.finishMinting({ from });

          const mintingFinished = await this.token.mintingFinished();
          assert.equal(mintingFinished, true);
        });

        it('emits a mint finished event', async function () {
          const { logs } = await this.token.finishMinting({ from });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'MintFinished');
        });
      });

      describe('when the token was already finished', function () {
        beforeEach(async function () {
          await this.token.finishMinting({ from });
        });

        it('reverts', async function () {
          await assertRevert(this.token.finishMinting({ from }));
        });
      });
    });

    describe('when the sender is not the token owner', function () {
      const from = anotherAccount;

      describe('when the token was not finished', function () {
        it('reverts', async function () {
          await assertRevert(this.token.finishMinting({ from }));
        });
      });

      describe('when the token was already finished', function () {
        beforeEach(async function () {
          await this.token.finishMinting({ from: owner });
        });

        it('reverts', async function () {
          await assertRevert(this.token.finishMinting({ from }));
        });
      });
    });
  });

  describe('mint', function () {
    const amount = 100;

    describe('when the sender is the token owner', function () {
      const from = owner;

      describe('when the token was not finished', function () {
        it('mints the requested amount', async function () {
          await this.token.mint(owner, amount, { from });

          const balance = await this.token.balanceOf(owner);
          assert.equal(balance, amount);
        });

        it('emits a mint finished event', async function () {
          const { logs } = await this.token.mint(owner, amount, { from });

          assert.equal(logs.length, 2);
          assert.equal(logs[0].event, 'Mint');
          assert.equal(logs[0].args.to, owner);
          assert.equal(logs[0].args.amount, amount);
          assert.equal(logs[1].event, 'Transfer');
        });
      });

      describe('when the token minting is finished', function () {
        beforeEach(async function () {
          await this.token.finishMinting({ from });
        });

        it('reverts', async function () {
          await assertRevert(this.token.mint(owner, amount, { from }));
        });
      });
    });

    describe('when the sender is not the token owner', function () {
      const from = anotherAccount;

      describe('when the token was not finished', function () {
        it('reverts', async function () {
          await assertRevert(this.token.mint(owner, amount, { from }));
        });
      });

      describe('when the token was already finished', function () {
        beforeEach(async function () {
          await this.token.finishMinting({ from: owner });
        });

        it('reverts', async function () {
          await assertRevert(this.token.mint(owner, amount, { from }));
        });
      });
    });
  });
});


contract('Capped', function (accounts) {
  const cap = ether(1000);

  let token;

  beforeEach(async function () {
    token = await Surfcoin.new(cap);
  });

  it('should start with the correct cap', async function () {
    let _cap = await token.cap();

    assert(cap.eq(_cap));
  });

  it('should mint when amount is less than cap', async function () {
    const result = await token.mint(accounts[0], 100);
    assert.equal(result.logs[0].event, 'Mint');
  });

  it('should fail to mint if the ammount exceeds the cap', async function () {
    await token.mint(accounts[0], cap.sub(1));
    await expectThrow(token.mint(accounts[0], 100));
  });

  it('should fail to mint after cap is reached', async function () {
    await token.mint(accounts[0], cap);
    await expectThrow(token.mint(accounts[0], 1));
  });
});


contract('BurnableToken', function ([owner]) {
  const initialBalance = 1000;

  beforeEach(async function () {
    this.token = await Surfcoin.new(initialBalance);
    let result = await this.token.mint(owner, initialBalance);
  });

  describe('as a basic burnable token', function () {
    const from = owner;

    describe('when the given amount is not greater than balance of the sender', function () {
      const amount = 100;

      beforeEach(async function () {
        ({ logs: this.logs } = await this.token.burn(amount, { from }));
      });

      it('burns the requested amount', async function () {
        const balance = await this.token.balanceOf(from);
        balance.should.be.bignumber.equal(initialBalance - amount);
      });

      it('emits a burn event', async function () {
        const event = await inLogs(this.logs, 'Burn');
        event.args.burner.should.eq(owner);
        event.args.value.should.be.bignumber.equal(amount);
      });

      it('emits a transfer event', async function () {
        const event = await inLogs(this.logs, 'Transfer');
        event.args.from.should.eq(owner);
        event.args.to.should.eq(ZERO_ADDRESS);
        event.args.value.should.be.bignumber.equal(amount);
      });
    });

    describe('when the given amount is greater than the balance of the sender', function () {
      const amount = initialBalance + 1;

      it('reverts', async function () {
        await assertRevert(this.token.burn(amount, { from }));
      });
    });
  });

});


contract('PausableToken', function ([_, owner, recipient, anotherAccount]) {
  beforeEach(async function () {
    this.token = await Surfcoin.new(100, { from: owner });
    let result = await this.token.mint(owner, 100, { from: owner });
  });

  describe('pause', function () {
    describe('when the sender is the token owner', function () {
      const from = owner;

      describe('when the token is unpaused', function () {
        it('pauses the token', async function () {
          await this.token.pause({ from });

          const paused = await this.token.paused();
          assert.equal(paused, true);
        });

        it('emits a Pause event', async function () {
          const { logs } = await this.token.pause({ from });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Pause');
        });
      });

      describe('when the token is paused', function () {
        beforeEach(async function () {
          await this.token.pause({ from });
        });

        it('reverts', async function () {
          await assertRevert(this.token.pause({ from }));
        });
      });
    });

    describe('when the sender is not the token owner', function () {
      const from = anotherAccount;

      it('reverts', async function () {
        await assertRevert(this.token.pause({ from }));
      });
    });
  });

  describe('unpause', function () {
    describe('when the sender is the token owner', function () {
      const from = owner;

      describe('when the token is paused', function () {
        beforeEach(async function () {
          await this.token.pause({ from });
        });

        it('unpauses the token', async function () {
          await this.token.unpause({ from });

          const paused = await this.token.paused();
          assert.equal(paused, false);
        });

        it('emits an Unpause event', async function () {
          const { logs } = await this.token.unpause({ from });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Unpause');
        });
      });

      describe('when the token is unpaused', function () {
        it('reverts', async function () {
          await assertRevert(this.token.unpause({ from }));
        });
      });
    });

    describe('when the sender is not the token owner', function () {
      const from = anotherAccount;

      it('reverts', async function () {
        await assertRevert(this.token.unpause({ from }));
      });
    });
  });

  describe('pausable token', function () {
    const from = owner;

    describe('paused', function () {
      it('is not paused by default', async function () {
        const paused = await this.token.paused({ from });

        assert.equal(paused, false);
      });

      it('is paused after being paused', async function () {
        await this.token.pause({ from });
        const paused = await this.token.paused({ from });

        assert.equal(paused, true);
      });

      it('is not paused after being paused and then unpaused', async function () {
        await this.token.pause({ from });
        await this.token.unpause({ from });
        const paused = await this.token.paused();

        assert.equal(paused, false);
      });
    });

    describe('transfer', function () {
      it('allows to transfer when unpaused', async function () {
        await this.token.transfer(recipient, 100, { from: owner });

        const senderBalance = await this.token.balanceOf(owner);
        assert.equal(senderBalance, 0);

        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 100);
      });

      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.transfer(recipient, 100, { from: owner });

        const senderBalance = await this.token.balanceOf(owner);
        assert.equal(senderBalance, 0);

        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 100);
      });

      it('reverts when trying to transfer when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.transfer(recipient, 100, { from: owner }));
      });
    });

    describe('approve', function () {
      it('allows to approve when unpaused', async function () {
        await this.token.approve(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 40);
      });

      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.approve(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 40);
      });

      it('reverts when trying to transfer when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.approve(anotherAccount, 40, { from: owner }));
      });
    });

    describe('transfer from', function () {
      beforeEach(async function () {
        await this.token.approve(anotherAccount, 50, { from: owner });
      });

      it('allows to transfer from when unpaused', async function () {
        await this.token.transferFrom(owner, recipient, 40, { from: anotherAccount });

        const senderBalance = await this.token.balanceOf(owner);
        assert.equal(senderBalance, 60);

        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 40);
      });

      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.transferFrom(owner, recipient, 40, { from: anotherAccount });

        const senderBalance = await this.token.balanceOf(owner);
        assert.equal(senderBalance, 60);

        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 40);
      });

      it('reverts when trying to transfer from when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.transferFrom(owner, recipient, 40, { from: anotherAccount }));
      });
    });

    describe('decrease approval', function () {
      beforeEach(async function () {
        await this.token.approve(anotherAccount, 100, { from: owner });
      });

      it('allows to decrease approval when unpaused', async function () {
        await this.token.decreaseApproval(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 60);
      });

      it('allows to decrease approval when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.decreaseApproval(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 60);
      });

      it('reverts when trying to transfer when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.decreaseApproval(anotherAccount, 40, { from: owner }));
      });
    });

    describe('increase approval', function () {
      beforeEach(async function () {
        await this.token.approve(anotherAccount, 100, { from: owner });
      });

      it('allows to increase approval when unpaused', async function () {
        await this.token.increaseApproval(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 140);
      });

      it('allows to increase approval when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.increaseApproval(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 140);
      });

      it('reverts when trying to increase approval when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.increaseApproval(anotherAccount, 40, { from: owner }));
      });
    });
  });
});



