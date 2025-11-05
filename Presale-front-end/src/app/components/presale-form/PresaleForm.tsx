'use client';


import { useState, useEffect } from "react";
import { useAccount, useSignMessage, useWalletClient } from "wagmi";
import snsWebSdk from "@sumsub/websdk";
import axios from "axios";
import { ethers } from "ethers";


import CurrencyInput from "./CurrencyInput";
import CurrencyRadio from "./CurrencyRadio";
import CurrentBalance from "./CurrentBalance";
import FormTitle from "./FormTitle";
import GasFee from "./GasFee";
import SupplyStatus from "./SupplyStatus";
import TermsCheckbox from "./TermsCheckbox";
import TokenBalance from "./TokenBalance";
import TokenPrice from "./TokenPrice";


const Currencies = [
 { name: "Ethereum", symbol: "ETH", iconURL: "img/currencies/ETH.png", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
 { name: "USD Coin", symbol: "USDC", iconURL: "img/currencies/USDC.png", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
 { name: "Tether USD", symbol: "USDT", iconURL: "img/currencies/USDT.png", address: "0x514910771AF9Ca656af840dff83E8264EcF986CA" },
 { name: "Chainlink", symbol: "LINK", iconURL: "img/currencies/LINK.png", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" },
 { name: "Wrapped BNB", symbol: "WBNB", iconURL: "img/currencies/WBNB.png", address: "0x...WBNB_ADDRESS" },
 { name: "Wrapped Ethereum", symbol: "WETH", iconURL: "img/currencies/WETH.png", address: "0x...WETH_ADDRESS" },
 { name: "Wrapped Bitcoin", symbol: "WBTC", iconURL: "img/currencies/WBTC.png", address: "0x...WBTC_ADDRESS" },
];


// Contract configuration
const PRESALE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PRESALE_CONTRACT_ADDRESS || "0x...PRESALE_CONTRACT_ADDRESS";
const NATIVE_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // ETH native address
const PRESALE_ABI = [
 "function buyWithNativeVoucher(address beneficiary, tuple(address buyer, address beneficiary, address paymentToken, uint256 usdLimit, uint256 nonce, uint256 deadline, address presale) voucher, bytes signature) external payable",
 "function buyWithTokenVoucher(address token, uint256 amount, address beneficiary, tuple(address buyer, address beneficiary, address paymentToken, uint256 usdLimit, uint256 nonce, uint256 deadline, address presale) voucher, bytes signature) external"
];
// ERC20 ABI for token approval
const ERC20_ABI = [
 "function approve(address spender, uint256 amount) external returns (bool)",
 "function allowance(address owner, address spender) external view returns (uint256)",
 "function decimals() external view returns (uint8)"
];


const PresaleForm = () => {
 const [loading, setLoading] = useState(false);
 const [isVerified, setIsVerified] = useState(false);
 const [verificationStatus, setVerificationStatus] = useState('pending'); // 'pending', 'verified', 'rejected'
 const [selectedCurrency, setSelectedCurrency] = useState('ETH');
 const [amount, setAmount] = useState(0);
  const { address, isConnected } = useAccount();
 const { signMessageAsync } = useSignMessage();
 const { data: walletClient } = useWalletClient();


 // Check verification status from backend
 const checkVerificationStatus = async (userId: string) => {
   if (!userId) return;


   try {


     console.log("➡️ userId:", userId);


     const url = `${process.env.NEXT_PUBLIC_API_URL1 || 'https://dynastical-xzavier-unsanguinarily.ngrok-free.dev'}/api/verify/status/${userId}`;
     console.log("➡️ Fetching verification status from:", url);


     const response = await axios.get(url);


     console.log("✅ Verification status checked:", response.data);
     console.log("✅ response.data.verified:", response.data.verified);
     console.log("✅ response.data.status:", response.data.status);
     console.log("✅ response.data:", response.data);
    
     if (response.data.verified === true) {
       setIsVerified(true);
       setVerificationStatus('verified');
     } else {
       setIsVerified(false);
       setVerificationStatus(response.data.status || 'pending');
     }
   } catch (err: any) {
     console.error("❌ Error checking verification status:", err);
     // Don't update state on error, keep current status
   }
 };


 // Check verification status when wallet connects or address changes
 useEffect(() => {
   if (isConnected && address) {
     // Check immediately when wallet connects
     checkVerificationStatus(address);
    
     // Poll every 5 seconds to check if verification was completed
     // (in case webhook updates status in backend)
     const pollInterval = setInterval(() => {
       checkVerificationStatus(address);
     }, 5000);


     return () => clearInterval(pollInterval);
   } else {
     // Reset when wallet disconnects
     setIsVerified(false);
     setVerificationStatus('pending');
   }
 }, [isConnected, address]);


 const handleVerifyClick = async () => {
   try {
     setLoading(true);


     // 🔹 Step 1: Request SDK token from backend
     const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'https://dynastical-xzavier-unsanguinarily.ngrok-free.dev'}/api/verify/start`, {
       userId: address, // Use wallet address as userId
       email: "user@example.com",
       phone: "+1234567890",
     });


     const { token } = response.data;
     console.log("✅ Access token received:", token, "Response:", response.data);


     // 🔹 Step 2: Initialize and launch Sumsub Web SDK
     const snsWebSdkInstance = snsWebSdk
       .init(token, () => Promise.resolve(token)) // Token refresh callback
       .withConf({
         lang: "en",
         theme: "light",
       })
       .withOptions({
         addViewportTag: false,
         adaptIframeHeight: true,
       })
       .on("idCheck.onStepCompleted", (payload) => {
         console.log("✅ Verification step completed:", payload);
         // Check verification status after step completion
         // The backend webhook will update the status, polling will pick it up
         if (address) {
           setTimeout(() => checkVerificationStatus(address), 3000);
         }
       })
       .on("idCheck.onError", (error) => {
         console.error("❌ SDK Error:", error);
         setVerificationStatus('rejected');
         setIsVerified(false);
       })
       .build();


     snsWebSdkInstance.launch("#sumsub-websdk-container");
   } catch (err: any) {
     console.error("❌ Error starting verification:", err);
    
     if (err.code === 'NETWORK_ERROR' || err.message === 'Network Error') {
       alert("Cannot connect to backend server. Make sure it's running on port 3000.");
     } else if (err.response?.status === 404) {
       alert("Backend API endpoint not found. Check if the server is running correctly.");
     } else {
       alert(`Failed to start verification: ${err.response?.data?.error || err.message}`);
     }
   } finally {
     setLoading(false);
   }
 };


 const handleBuyTokens = async () => {
   if (!isConnected || !address) {
     alert("Please connect your wallet first");
     return;
   }


   // if (!isVerified) {
   //   alert("Please complete verification first");
   //   return;
   // }


   if (!amount || amount <= 0) {
     alert("Please enter an amount to purchase");
     return;
   }


   console.log("💰 Amount:", amount);
   console.log("💰 Selected currency:", selectedCurrency);


   console.log("💰 Address:", address);


   try {
     setLoading(true);


     console.log("💰 PRESALE_CONTRACT_ADDRESS:");


     // Step 1: Prepare currency data
     const selectedCurrencyData = Currencies.find(c => c.symbol === selectedCurrency);
     const isNativeCurrency = selectedCurrency === 'ETH';
     const paymentTokenAddress = isNativeCurrency ? NATIVE_ADDRESS : (selectedCurrencyData?.address || NATIVE_ADDRESS);


     console.log("Step 2: Request voucher from backend");
     // Step 2: Request voucher from backend
     const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'https://dynastical-xzavier-unsanguinarily.ngrok-free.dev'}/api/presale/voucher`, {
       buyer: address,
       beneficiary: address,
       paymentToken: paymentTokenAddress,
       usdAmount: amount,// Convert to USD (example rate)
       userId: address
     });


     console.log("✅ Voucher response:", response.data);


     const { voucher, signature } = response.data;
     console.log("✅ Voucher received:", { voucher, signature });


     console.log("Step 3: Create contract instances");
     // Step 3: Create contract instances
     if (!walletClient) {
       throw new Error("Wallet not connected");
     }


     const provider = new ethers.BrowserProvider(walletClient);
     const signer = await provider.getSigner();
     const presaleContract = new ethers.Contract(PRESALE_CONTRACT_ADDRESS, PRESALE_ABI, signer);
    
     // Prepare voucher struct for contract call
     const voucherStruct = [
       voucher.buyer,
       voucher.beneficiary,
       voucher.paymentToken,
       voucher.usdLimit,
       voucher.nonce,
       voucher.deadline,
       voucher.presale
     ];


     const beneficiary = address; // User's wallet address


     let tx;


     if (isNativeCurrency) {
       // Step 4a: Purchase with native ETH using buyWithNativeVoucher
       const ethAmount = ethers.parseEther(amount.toString()); // Convert to wei
      
       console.log("💰 Purchasing with ETH:", {
         amount: ethAmount.toString(),
         beneficiary,
         voucher,
         signature
       });


       // Call buyWithNativeVoucher with msg.value
       tx = await presaleContract.buyWithNativeVoucher(
         beneficiary,
         voucherStruct,
         signature,
         { value: ethAmount } // Send ETH with the transaction
       );
     } else {
       // Step 4b: Purchase with ERC20 token using buyWithTokenVoucher
       // First, get token decimals (default to 18 if not available)
       const tokenContract = new ethers.Contract(paymentTokenAddress, ERC20_ABI, signer);
       let tokenDecimals = 18;
       try {
         tokenDecimals = await tokenContract.decimals();
       } catch (e) {
         console.warn("Could not fetch token decimals, using 18:", e);
       }


       const tokenAmount = ethers.parseUnits(amount.toString(), tokenDecimals);
      
       console.log("💳 Purchasing with token:", {
         token: paymentTokenAddress,
         amount: tokenAmount.toString(),
         decimals: tokenDecimals,
         beneficiary,
         voucher,
         signature
       });


       // Check current allowance
       const currentAllowance = await tokenContract.allowance(address, PRESALE_CONTRACT_ADDRESS);
       console.log("Current allowance:", currentAllowance.toString());


       // Approve token spending if needed
       if (currentAllowance < tokenAmount) {
         console.log("Approving token spending...");
         const approveTx = await tokenContract.approve(PRESALE_CONTRACT_ADDRESS, tokenAmount);
         console.log("Approval transaction submitted:", approveTx.hash);
         await approveTx.wait();
         console.log("✅ Token approved");
       }


       // Call buyWithTokenVoucher
       tx = await presaleContract.buyWithTokenVoucher(
         paymentTokenAddress,
         tokenAmount,
         beneficiary,
         voucherStruct,
         signature
       );
     }


     console.log("Transaction submitted:", tx.hash);
    
     // Wait for transaction confirmation
     const receipt = await tx.wait();
     console.log("Transaction confirmed:", receipt);


     alert(`Purchase successful! Transaction hash: ${tx.hash}`);
     console.log("✅ Token purchase completed successfully!");


   } catch (err: any) {
     console.error("❌ Error buying tokens:", err);
     const errorMessage = err.response?.data?.error || err.reason || err.message || "Unknown error";
     alert(`Failed to buy tokens: ${errorMessage}`);
   } finally {
     setLoading(false);
   }
 };


 return (
   <>
   <form id="presale-form" className="relative max-w-[720px] py-4 px-4 md:px-6 md:py-8 mb-4 rounded-md border border-body-text overflow-hidden">
     <FormTitle />
     <TokenPrice title="1 $ESCROW" subtitle="$0.015" />
     <SupplyStatus presaleSupply={8000000} tokensSold={1923400} />


     <div className="w-full h-[1px] my-4 bg-body-text rounded-full"></div>


     <h2 className="text-bg-logo font-semibold text-sm md:text-base">You deposit</h2>
     <div className="md:mb-2 mb-1 mt-2 mx-auto flex items-center justify-center flex-wrap md:gap-2 gap-1">
       {Currencies.slice(0, 4).map((currency, i) => (
         <CurrencyRadio key={i} symbol={currency.symbol} iconURL={currency.iconURL} />
       ))}
     </div>
     <div className="mb-3 mx-auto flex items-center justify-center flex-wrap md:gap-2 gap-1">
       <div className="flex-[0.5_1_0]"></div>
       {Currencies.slice(4, 7).map((currency, i) => (
         <CurrencyRadio key={i} symbol={currency.symbol} iconURL={currency.iconURL} />
       ))}
       <div className="flex-[0.5_1_0]"></div>
     </div>


     <CurrentBalance currentBalance={2.3456} currency={{ iconURL: "img/currencies/ETH.png", symbol: "ETH" }} />
     <CurrencyInput
       currencyBalance={2.3456}
       currencyIconURL="img/currencies/ETH.png"
       currencySymbol={selectedCurrency}
       usdValue={1850}
       value={amount}
       onChange={(value) => setAmount(value)}
     />
     <GasFee />


     <TokenPrice title="You will receive" subtitle="166K $ESCROW" />
     <TokenBalance />


     {/* 🔹 Verification/Buy button */}
     <button
       type="button"
       disabled={loading || !isConnected}
       onClick={isVerified ? handleBuyTokens : handleVerifyClick}
       className={`w-full py-3 md:py-4 mt-4 font-medium border text-sm md:text-base tracking-tight rounded-full cursor-pointer duration-200 ${
         isVerified
           ? 'border-green-500 text-green-500 hover:bg-green-500 hover:text-black'
           : 'border-bg-logo text-bg-logo hover:text-black hover:border-bg-logo hover:bg-bg-logo'
       } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
     >
       {loading
         ? (isVerified ? "Processing Purchase..." : "Launching Verification...")
         : !isConnected
           ? "Connect Wallet First"
           : isVerified
             ? "Buy Tokens Now"
             : "Get verified to buy"
       }
     </button>


     {/* 🔹 Sumsub Web SDK iframe container */}
     <div id="sumsub-websdk-container" className="mt-4"></div>


     <TermsCheckbox />
     <img id="bg-form" src="/img/form-bg.jpg" className="absolute opacity-15 w-full h-full inset-0 -z-50" alt="" />
   </form>
 
 </>
 );
};


export default PresaleForm;
