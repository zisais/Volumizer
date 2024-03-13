import React, { useState } from 'react'
import volumizer_abi from './volumizer_abi.json'
import erc20_abi from './erc20_abi.json'
import { formatEther } from 'ethers/lib/utils';
const ethers = require('ethers');

const Volumizer = () => {
    const $ = selector => document.querySelector(selector);

    const contractAddress = '0x3eeC3f2513965Ca70529ceB91d3062C4C2451105';
    const wethContractAddress = '0x4200000000000000000000000000000000000006';
    const poolAddress = '0x20E068D76f9E90b90604500B84c7e19dCB923e7e';
    const poolFee = 0.0001;
    const fee = ethers.utils.parseEther('0.001');
    const overrides = {
        value: fee
    }

    // text colors
    const addressColor = '#33ccff';

    const [errorMessage, setErrorMessage] = useState(null);
    const [defaultAccount, setDefaultAccount] = useState(null);
    const [connectButtonText, setConnectButtonText] = useState('Connect Wallet');

    const [wethAllowance, setWethAllowance] = useState('0.000');
    const [wethContract, setWethContract] = useState(null);

    const [uniswapFee, setUniswapFee] = useState('0.000');
    const [poolWethBalance, setPoolWethBalance] = useState(null);

    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [chainId, setChainId] = useState(null);
    
    const [txId, setTxId] = useState(null);
    const [explorerLink, setExplorerLink] = useState("https://basescan.org/");
    const [linkVisibility, setLinkVisibility] = useState(false);

    // Force page refreshes on network changes
    // {
    //     // The "any" network will allow spontaneous network changes
    //     const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    //     provider.on("network", (newNetwork, oldNetwork) => {
    //         // When a Provider makes its initial connection, it emits a "network"
    //         // event with a null oldNetwork along with the newNetwork. So, if the
    //         // oldNetwork exists, it represents a changing network
    //         if (oldNetwork) {
    //             window.location.reload();
    //         }
    //     });
    // }

    const connectWalletHandler = () => {
        if (window.ethereum){
            window.ethereum.request({method: "eth_requestAccounts"})
            .then(result => {
                accountChangedHandler(result[0]);
                setConnectButtonText('Wallet Connected');
                updateEthers();
            });
        } else {
            setErrorMessage("Need to install MetaMask");
        }
        
    }

    const chainValidator = async (tempSigner) => {
        if (tempSigner.getChainId() === 8453) {
            let tempContract = new ethers.Contract(contractAddress, volumizer_abi, signer);
            setContract(tempContract);
            console.log(tempContract.owner());

            let tempWethContract = new ethers.Contract(wethContractAddress, erc20_abi, tempSigner);
            setWethContract(tempWethContract);
            updateAllowance(tempSigner, tempWethContract);
            updatePoolBalance(tempWethContract);
        }
        else {
            try {
                await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: ethers.utils.hexValue(8453) }]
                })
                .then((result) => {
                    if (result === null) {
                        let tempContract = new ethers.Contract(contractAddress, volumizer_abi, tempSigner);
                        setContract(tempContract);
                        console.log(tempContract.owner());

                        let tempWethContract = new ethers.Contract(wethContractAddress, erc20_abi, tempSigner);
                        setWethContract(tempWethContract);
                        updateAllowance(tempSigner, tempWethContract);
                        updatePoolBalance(tempWethContract);
                    }
                })
                .catch((error) => { setErrorMessage(error.message) });
            }
            catch (error) { }
        }
    }
 
    const accountChangedHandler = (newAccount) => {
        setDefaultAccount(newAccount);
        updateEthers();
    }

    const updateEthers = async () => {
        try {        
            let tempProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
            setProvider(tempProvider);

            let tempSigner = tempProvider.getSigner();
            setSigner(tempSigner);

            chainValidator(tempSigner);
        }
        catch(error) { };
    }

    const updateUniFee = () => {
        let amt = parseFloat($("#amount").value);
        setUniswapFee(amt * poolFee);
    }

    const executeHandler = async () => {
        try {
            let wethAmt = ethers.utils.parseEther($("#amount").value);
            let tx = await contract.start(wethContractAddress, wethAmt, overrides);
            let receipt = await tx.wait();
            if (receipt.status === 1) {
                let txHash = receipt.transactionHash
                setTxId(txHash);
                setExplorerLink(explorerLink + "/tx/" + txHash);
                setLinkVisibility(true);
                setErrorMessage(null);
            } else if (receipt.status === 0) {
                let txHash = receipt.transactionHash
                setTxId(txHash);
                setExplorerLink(explorerLink + "/tx/" + txHash);
                setLinkVisibility(true);
                setErrorMessage(null);

                setErrorMessage("Transaction failed.");
            }
        }
        catch(error) {
            setErrorMessage(error.message);
        }
    }

    const updateAllowance = async (tempSigner,tempWethContract) => {
        let allwnce = await tempWethContract.allowance(tempSigner.getAddress(),contractAddress);
        let bigAllwnce = ethers.BigNumber.from(allwnce);        
        let AllwnceStr = formatEther(bigAllwnce);
        setWethAllowance(AllwnceStr);
    }

    const updatePoolBalance = async (tempWethContract) => {
        let balance = await tempWethContract.balanceOf(poolAddress);
        let bigBalance = ethers.BigNumber.from(balance);
        let balanceStr = formatEther(balance);
        setPoolWethBalance(balanceStr);
    }
 
    const addWhitelistHandler = () => {

    }

    const checkWhitelisted = () => {

    }

    return (
        <body style={{ width: "50%", padding: "0 25%" }}>
            <main>
                <div style={{ paddingBottom: "1.5rem" }}>
                    <h1>Volumizer</h1>
                    <h3>Increase on-chain volume via WETH Uniswap flashloans on BASE</h3>
                </div>

                <div id='connectDiv' style={{ textAlign: "right" }}>
                    <span style={{float: "left", color: addressColor}}>Current Address: {defaultAccount}</span>
                    <button id='btnConnect' onClick={connectWalletHandler}>{connectButtonText}</button>
                </div>

                <fieldset>
                    <legend>Flash Loan</legend>
                    <div>
                        <p>Loan amount: <input id="amount" type="number" min="0" step="any" onChange={updateUniFee}/> WETH</p>
                        <span style={{ float: "inline-start" }}>Uniswap Fee: {uniswapFee} WETH</span>
                        <span style={{ float: "inline-end" }}>Current Allowance: {wethAllowance} WETH</span><br/>
                        <span style={{ float: "inline-start" }}>WETH in Pool: {poolWethBalance} WETH</span>
                    </div>
                    
                    <div style={{ paddingTop: "2.5rem" }}>
                        <button onClick={executeHandler}>Execute</button> &nbsp;
                    </div>
                </fieldset>

                <div>
                    {linkVisibility && <span style={{ float: "inline-start" }}>Transaction: <a target="_blank" rel="noopener noreferrer" href={explorerLink}>{txId}</a></span>}
                </div>

                <div style={{ marginTop: "4rem" }}>
                    <h4>How it works:</h4>
                    <p>
                        Wrapped Ether is borrowed from Uniswap, and then sent to your address. 
                        The WETH is then pulled back to the Volumizer contract, and repaid back to Uniswap. 
                        Fees include Uniswap swapping fee (.01% with current pool), 
                        plus 0.001 ETH Volumizer fee.
                    </p>
                    <p style={{ fontWeight: "bold" }}>
                        *You must have enough WETH in your wallet to cover the Uniswap Fee. Contract allowance should be at least loan + uniswap fee.*
                    </p>
                </div>

                <br/>
                <div>
                    {errorMessage}
                </div>
            </main>
        </body>
    )
}

export default Volumizer;