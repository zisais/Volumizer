import React, { useState, useEffect } from 'react'
import volumizerBase_abi from './volumizerBase_abi.json'
import volumizerZk_abi from './volumizerZk_abi.json'
import erc20_abi from './erc20_abi.json'
const ethers = require('ethers');

const Volumizer = () => {
    const $ = selector => document.querySelector(selector);

    const contractAddressBase = '0x6338Dda957dbeF9a398B4D3b16EE4BC621d06DEA';
    const contractAddressZkSync = '0xa56e43aD723B58712a78eE625Db00702aF23003f';
    const wethContractAddress = '0x4200000000000000000000000000000000000006';
    const usdcContractAddress = '0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4';
    const uniPoolAddress = '0x20E068D76f9E90b90604500B84c7e19dCB923e7e';
    const cakePoolAddress = '0x3832fB996C49792e71018f948f5bDdd987778424';

    const poolFee = 0.0001;
    const fee = ethers.utils.parseEther('0.001');
    const overrides = {
        value: fee
    }

    // strings
    const wethAmtLabel = 'WETH';
    const usdcAmtLabel = 'USDC';
    const uniLabel = 'Uniswap';
    const pcakeLabel = 'PancakeSwap';

    // text colors
    const addressColor = '#33ccff';

    const [errorMessage, setErrorMessage] = useState(null);
    const [defaultAccount, setDefaultAccount] = useState(null);
    const [connectButtonText, setConnectButtonText] = useState('Connect Wallet');
    const [walletConnected, setWalletConnected] = useState(false);

    const [selectedChain, setSelectedChain] = useState('base');
    const [amtLabel, setAmtLabel] = useState(wethAmtLabel);
    const [exLabel, setExLabel] = useState(uniLabel);

    const [tokenAllowance, setTokenAllowance] = useState('0.000');
    const [wethContract, setWethContract] = useState(null);
    const [usdcContract, setUsdcContract] = useState(null);

    const [exchangeFee, setExchangeFee] = useState('0.000');
    const [poolBalance, setPoolBalance] = useState(null);

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

    const onChainChange = (evt) => {
        setSelectedChain(evt.target.value);
    }

    useEffect(() => {
        if (selectedChain === "base") {
            setAmtLabel(wethAmtLabel);
            setExLabel(uniLabel);
        } else if (selectedChain === 'zksync') {
            setAmtLabel(usdcAmtLabel);
            setExLabel(pcakeLabel);
        }
    }, [selectedChain]);

    useEffect(() => {
        if (walletConnected) { updateEthers(); }
    }, [selectedChain]);

    const connectWalletHandler = () => {
        if (window.ethereum) {
            window.ethereum.request({ method: "eth_requestAccounts" })
                .then(result => {
                    accountChangedHandler(result[0]);
                    setConnectButtonText('Wallet Connected');
                    setWalletConnected(true);
                    updateEthers();
                });
        } else {
            setErrorMessage("Need to install MetaMask");
        }

    }

    const chainValidator = async (tempSigner) => {
        if (selectedChain === 'base') {
            if (tempSigner.getChainId() === 8453) { // base
                let tempContract = new ethers.Contract(contractAddressBase, volumizerBase_abi, signer);
                setContract(tempContract);

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
                                let tempContract = new ethers.Contract(contractAddressBase, volumizerBase_abi, tempSigner);
                                setContract(tempContract);

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
        else if (selectedChain === 'zksync') {
            if (tempSigner.getChainId === 324) { // zksync
                let tempContract = new ethers.Contract(contractAddressZkSync, volumizerZk_abi, signer);
                setContract(tempContract);

                let tempUsdcContract = new ethers.Contract(usdcContractAddress, erc20_abi, tempSigner);
                setUsdcContract(tempUsdcContract);
                updateAllowance(tempSigner, tempUsdcContract);
                updatePoolBalance(tempUsdcContract);
            }
            else {
                try {
                    await window.ethereum.request({
                        method: "wallet_switchEthereumChain",
                        params: [{ chainId: ethers.utils.hexValue(324) }]
                    })
                        .then((result) => {
                            if (result === null) {
                                let tempContract = new ethers.Contract(contractAddressBase, volumizerBase_abi, tempSigner);
                                setContract(tempContract);

                                let tempUsdcContract = new ethers.Contract(usdcContractAddress, erc20_abi, tempSigner);
                                setWethContract(tempUsdcContract);
                                updateAllowance(tempSigner, tempUsdcContract);
                                updatePoolBalance(tempUsdcContract);
                            }
                        })
                        .catch((error) => { setErrorMessage(error.message) });
                }
                catch (error) { }
            }
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
        catch (error) { };
    }

    const updateUniFee = () => {
        let amt = parseFloat($("#amount").value);
        setExchangeFee((amt * poolFee).toFixed(18));
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
        catch (error) {
            setErrorMessage(error.message);
        }
    }

    const allowanceHandler = async () => {
        let wethAmt = ethers.utils.parseEther($("#amount").value);
        let uniBig = ethers.utils.parseEther(exchangeFee);
        await wethContract.approve(contractAddressBase, wethAmt.add(uniBig));
    }


    const updateAllowance = async (tempSigner, tempTokenContract) => {
        let allowance = selectedChain === 'base' ?
            await tempTokenContract.allowance(tempSigner.getAddress(), contractAddressBase) :
            await tempTokenContract.allowance(tempSigner.getAddress(), contractAddressZkSync);

        // Convert allowance to the appropriate decimal format
        const decimalAdjustment = selectedChain === 'base' ? 18 : 6;
        const formattedAllowance = ethers.utils.formatUnits(allowance, decimalAdjustment);

        setTokenAllowance(formattedAllowance);
    }

    const updatePoolBalance = async (tempTokenContract) => {
        let balance = selectedChain === 'base' ?
            await tempTokenContract.balanceOf(uniPoolAddress) :
            await tempTokenContract.balanceOf(cakePoolAddress);

        // Convert balance to the appropriate decimal format
        const decimalAdjustment = selectedChain === 'base' ? 18 : 6;
        const formattedBalance = ethers.utils.formatUnits(balance, decimalAdjustment);

        setPoolBalance(formattedBalance);
    }

    return (
        <body>
            <div style={{ float: 'right', padding: '0.5rem', marginRight: '5rem', border: 'solid' }}>
                <input style={{ float: 'inline-start' }} type='radio' id='base' name='chainRadio' value='base' onChange={onChainChange} checked={selectedChain === 'base'} />
                <label style={{ float: 'inline-start' }} htmlFor='base'>Base</label> <br />
                <input style={{ float: 'inline-start' }} type='radio' id='zksync' name='chainRadio' value='zksync' onChange={onChainChange} checked={selectedChain === 'zksync'} />
                <label style={{ float: 'inline-start' }} htmlFor='zksync'>zkSync Era</label>
            </div>
            <main style={{ width: "50%", padding: "0 25%" }}>
                <div style={{ paddingBottom: "1.5rem" }}>
                    <h1>Volumizer</h1>
                    <h3>Increase on-chain volume via flashloans</h3>
                </div>

                <div id='connectDiv' style={{ textAlign: "right" }}>
                    <span style={{ float: "left", color: addressColor }}>Current Address: {defaultAccount}</span>
                    <button id='btnConnect' onClick={connectWalletHandler}>{connectButtonText}</button>
                </div>

                <fieldset>
                    <legend>Flash Loan</legend>
                    <div>
                        <p>Loan amount: <input id="amount" type="number" min="0" step="any" onChange={updateUniFee} /> {amtLabel}</p>
                        <span style={{ float: "inline-start" }}>{exLabel} Fee: {exchangeFee} {amtLabel}</span>
                        <span style={{ float: "inline-end" }}>Current Allowance: {tokenAllowance} {amtLabel}</span><br />
                        <span style={{ float: "inline-start" }}>{amtLabel} in Pool: {poolBalance} {amtLabel}</span>
                    </div>

                    <div style={{ paddingTop: "2.5rem" }}>
                        <button onClick={allowanceHandler}>Set Allowance</button> &nbsp;
                        <button onClick={executeHandler}>Execute</button> &nbsp;
                    </div>
                </fieldset>

                <div>
                    {linkVisibility && <span style={{ float: "inline-start" }}>Transaction: <a target="_blank" rel="noopener noreferrer" href={explorerLink}>{txId}</a></span>}
                </div>

                <div style={{ marginTop: "4rem" }}>
                    <h4>How it works:</h4>
                    <p>
                        {amtLabel} is borrowed from {exLabel}, and then sent to your address.
                        The {amtLabel} is then pulled back to the Volumizer contract, and repaid back to {exLabel}.
                        Fees include {exLabel} swapping fee (.01% with current pool),
                        plus 0.001 ETH Volumizer fee.
                    </p>
                    <p style={{ fontWeight: "bold" }}>
                        *You must have enough {amtLabel} in your wallet to cover the {exLabel} Fee. Contract allowance should be at least loan + swap fee.*
                    </p>
                </div>

                <br />
                <div>
                    {errorMessage}
                </div>
            </main>
        </body>
    )
}

export default Volumizer;