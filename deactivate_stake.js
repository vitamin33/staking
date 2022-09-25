import {
    Connection,
    clusterApiUrl,
    Keypair,
    LAMPORTS_PER_SOL,
    StakeProgram,
    Authorized,
    Lockup,
    sendAndConfirmTransaction, PublicKey
} from "@solana/web3.js";

const main = async () => {
    const connection = new Connection(clusterApiUrl("devnet"), 'processed')
    const wallet = Keypair.generate()
    const airdropSignature = await connection.requestAirdrop(
        wallet.publicKey,
        1 * LAMPORTS_PER_SOL
    )
    await connection.confirmTransaction(airdropSignature)
    const stakeAccount = Keypair.generate()
    const minimumRent = await connection.getMinimumBalanceForRentExemption(StakeProgram.space)
    const amountUserWantToStake = 0.5 * LAMPORTS_PER_SOL
    const amountToStake = minimumRent + amountUserWantToStake
    const createStakeAccountTx = StakeProgram.createAccount({
        authorized: new Authorized(wallet.publicKey, wallet.publicKey),
        fromPubkey: wallet.publicKey,
        lamports: amountToStake,
        lockup: new Lockup(0, 0, wallet.publicKey),
        stakePubkey: stakeAccount.publicKey
    })
    const createStakeAccountTxId = await sendAndConfirmTransaction(connection, createStakeAccountTx, [wallet, stakeAccount])
    console.log("Stake account created. Stake account transaction id: ", createStakeAccountTxId)

    let stakedBalance = await connection.getBalance(stakeAccount.publicKey)
    console.log(`Staked account balance: ${stakedBalance / LAMPORTS_PER_SOL} SOL`)

    let stakeStatus = await connection.getStakeActivation(stakeAccount.publicKey)
    console.log("Status: ", stakeStatus.state)

    const validators = await connection.getVoteAccounts()
    const selectedValidator = validators.current[0]
    const selectedValidatorPubkey = new PublicKey(selectedValidator.votePubkey)
    const delegateTx = StakeProgram.delegate({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: wallet.publicKey,
        votePubkey: selectedValidatorPubkey
    })
    const delegateTxId = await sendAndConfirmTransaction(connection, delegateTx, [wallet])
    console.log(`Stake account delegated to: ${selectedValidatorPubkey}, Tx Id: ${delegateTxId}`)

    stakeStatus = await connection.getStakeActivation(stakeAccount.publicKey)
    console.log("Status: ", stakeStatus.state)

    const deactivateStakeTx = StakeProgram.deactivate({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: wallet.publicKey
    })
    const deactivateStakeTxId = await sendAndConfirmTransaction(connection, deactivateStakeTx, [wallet])
    console.log("Stake account is deactivated, tx id: ", deactivateStakeTxId)

    stakeStatus = await connection.getStakeActivation(stakeAccount.publicKey)
    console.log("Status: ", stakeStatus.state)
}
const runMain = async () => {
    try {
        await main()
    } catch (e) {
        console.log(e)
    }
}
runMain()