'use client';


import { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount, useSignMessage, useWalletClient } from "wagmi";
import axios from "axios";
import { BrowserProvider, Contract, Interface, JsonRpcProvider, formatUnits, parseEther, parseUnits } from "ethers";


import CurrencyInput from "./CurrencyInput";
import CurrencyRadio from "./CurrencyRadio";
import CurrentBalance from "./CurrentBalance";
import FormTitle from "./FormTitle";
import GasFee from "./GasFee";
import SupplyStatus from "./SupplyStatus";
import TermsCheckbox from "./TermsCheckbox";
import TokenBalance from "./TokenBalance";
import TokenPrice from "./TokenPrice";
import VerificationScreen from "./VerificationScreen";


const DEFAULT_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum.publicnode.com";
const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 1);
const PRICE_DECIMALS = 8;
const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";

type BaseCurrencyDefinition = {
  name: string;
  symbol: string;
  iconURL: string;
  address: string;
  isNative: boolean;
  defaultDecimals: number;
  fallbackPriceUsd: number;
  defaultActive: boolean;
};

const BASE_CURRENCIES: readonly BaseCurrencyDefinition[] = [
  {
    name: "Ethereum",
    symbol: "ETH",
    iconURL: "img/currencies/ETH.png",
    address: NATIVE_ADDRESS,
    isNative: true,
    defaultDecimals: 18,
    fallbackPriceUsd: 4200,
    defaultActive: true,
  },
  {
    name: "Wrapped Ethereum",
    symbol: "WETH",
    iconURL: "img/currencies/WETH.png",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    isNative: false,
    defaultDecimals: 18,
    fallbackPriceUsd: 4200,
    defaultActive: true,
  },
  {
    name: "Wrapped BNB",
    symbol: "WBNB",
    iconURL: "img/currencies/WBNB.png",
    address: "0x418D75f65a02b3D53B2418FB8E1fe493759c7605",
    isNative: false,
    defaultDecimals: 18,
    fallbackPriceUsd: 1000,
    defaultActive: true,
  },
  {
    name: "Chainlink",
    symbol: "LINK",
    iconURL: "img/currencies/LINK.png",
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    isNative: false,
    defaultDecimals: 18,
    fallbackPriceUsd: 20,
    defaultActive: true,
  },
  {
    name: "Wrapped Bitcoin",
    symbol: "WBTC",
    iconURL: "img/currencies/WBTC.png",
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    isNative: false,
    defaultDecimals: 8,
    fallbackPriceUsd: 45000,
    defaultActive: true,
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    iconURL: "img/currencies/USDC.png",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    isNative: false,
    defaultDecimals: 6,
    fallbackPriceUsd: 1,
    defaultActive: true,
  },
  {
    name: "Tether USD",
    symbol: "USDT",
    iconURL: "img/currencies/USDT.png",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    isNative: false,
    defaultDecimals: 6,
    fallbackPriceUsd: 1,
    defaultActive: true,
  },
] as const;

type TokenMetadata = {
  priceUsd: number;
  decimals: number;
  isActive: boolean;
};

type TokenPriceStruct = {
  priceUSD: bigint;
  isActive: boolean;
  decimals: number;
};

const buildFallbackMetadata = (): Record<string, TokenMetadata> => {
  const result: Record<string, TokenMetadata> = {};
  BASE_CURRENCIES.forEach((currency) => {
    result[currency.address.toLowerCase()] = {
      priceUsd: currency.fallbackPriceUsd,
      decimals: currency.defaultDecimals,
      isActive: currency.defaultActive,
    };
  });
  return result;
};

export type Currency = {
  name: string;
  symbol: string;
  iconURL: string;
  address: string;
  isNative: boolean;
  decimals: number;
  priceUsd: number;
  isActive: boolean;
};


// Contract configuration
// SEPOLIA TESTNET
const PRESALE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PRESALE_CONTRACT_ADDRESS || "0x...PRESALE_CONTRACT_ADDRESS";
// MAINNET: const PRESALE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PRESALE_CONTRACT_ADDRESS || "0x...MAINNET_PRESALE_ADDRESS";

const PRESALE_ABI = [
 "function buyWithNativeVoucher(address beneficiary, tuple(address buyer, address beneficiary, address paymentToken, uint256 usdLimit, uint256 nonce, uint256 deadline, address presale) voucher, bytes signature) external payable",
 "function buyWithTokenVoucher(address token, uint256 amount, address beneficiary, tuple(address buyer, address beneficiary, address paymentToken, uint256 usdLimit, uint256 nonce, uint256 deadline, address presale) voucher, bytes signature) external"
];
const TOKEN_PRICE_ABI = [
 "function getTokenPrice(address token) view returns (uint256 priceUSD,bool isActive,uint8 decimals)"
];
const SUPPLY_ABI = [
"function totalTokensMinted() view returns (uint256)",
"function maxTokensToMint() view returns (uint256)",
"function canClaim() view returns (bool)",
"function presaleRate() view returns (uint256)"
];
// Authorizer ABI - Complete from Etherscan
const AUTHORIZER_ABI = [{"inputs":[{"internalType":"address","name":"_signer","type":"address"},{"internalType":"address","name":"_owner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"ECDSAInvalidSignature","type":"error"},{"inputs":[{"internalType":"uint256","name":"length","type":"uint256"}],"name":"ECDSAInvalidSignatureLength","type":"error"},{"inputs":[{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"ECDSAInvalidSignatureS","type":"error"},{"inputs":[],"name":"InsufficientLimit","type":"error"},{"inputs":[],"name":"InvalidNonce","type":"error"},{"inputs":[],"name":"InvalidPaymentToken","type":"error"},{"inputs":[],"name":"InvalidPresaleAddress","type":"error"},{"inputs":[],"name":"InvalidShortString","type":"error"},{"inputs":[],"name":"InvalidSignature","type":"error"},{"inputs":[],"name":"InvalidSigner","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[{"internalType":"string","name":"str","type":"string"}],"name":"StringTooLong","type":"error"},{"inputs":[],"name":"VoucherAlreadyConsumed","type":"error"},{"inputs":[],"name":"VoucherExpired","type":"error"},{"inputs":[],"name":"ZeroAddress","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"buyer","type":"address"},{"indexed":false,"internalType":"string","name":"reason","type":"string"}],"name":"AuthorizationFailed","type":"event"},{"anonymous":false,"inputs":[],"name":"EIP712DomainChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"oldSigner","type":"address"},{"indexed":true,"internalType":"address","name":"newSigner","type":"address"}],"name":"SignerUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"buyer","type":"address"},{"indexed":false,"internalType":"uint256","name":"nonce","type":"uint256"},{"indexed":false,"internalType":"bytes32","name":"voucherHash","type":"bytes32"}],"name":"VoucherConsumed","type":"event"},{"inputs":[{"components":[{"internalType":"address","name":"buyer","type":"address"},{"internalType":"address","name":"beneficiary","type":"address"},{"internalType":"address","name":"paymentToken","type":"address"},{"internalType":"uint256","name":"usdLimit","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"address","name":"presale","type":"address"}],"internalType":"struct Authorizer.Voucher","name":"voucher","type":"tuple"},{"internalType":"bytes","name":"signature","type":"bytes"},{"internalType":"address","name":"paymentToken","type":"address"},{"internalType":"uint256","name":"usdAmount","type":"uint256"}],"name":"authorize","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"consumedVouchers","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"eip712Domain","outputs":[{"internalType":"bytes1","name":"fields","type":"bytes1"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"version","type":"string"},{"internalType":"uint256","name":"chainId","type":"uint256"},{"internalType":"address","name":"verifyingContract","type":"address"},{"internalType":"bytes32","name":"salt","type":"bytes32"},{"internalType":"uint256[]","name":"extensions","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getDomainSeparator","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getNonce","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"buyer","type":"address"},{"internalType":"address","name":"beneficiary","type":"address"},{"internalType":"address","name":"paymentToken","type":"address"},{"internalType":"uint256","name":"usdLimit","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"address","name":"presale","type":"address"}],"internalType":"struct Authorizer.Voucher","name":"voucher","type":"tuple"}],"name":"invalidateVoucher","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"voucherHash","type":"bytes32"}],"name":"isVoucherConsumed","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_newSigner","type":"address"}],"name":"setSigner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"signer","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"buyer","type":"address"},{"internalType":"address","name":"beneficiary","type":"address"},{"internalType":"address","name":"paymentToken","type":"address"},{"internalType":"uint256","name":"usdLimit","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"address","name":"presale","type":"address"}],"internalType":"struct Authorizer.Voucher","name":"voucher","type":"tuple"},{"internalType":"bytes","name":"signature","type":"bytes"},{"internalType":"address","name":"paymentToken","type":"address"},{"internalType":"uint256","name":"usdAmount","type":"uint256"}],"name":"validateVoucher","outputs":[{"internalType":"bool","name":"valid","type":"bool"},{"internalType":"string","name":"reason","type":"string"}],"stateMutability":"view","type":"function"}];
  

// ERC20 ABI for token approval
const ERC20_ABI = [
 "function approve(address spender, uint256 amount) external returns (bool)",
 "function allowance(address owner, address spender) external view returns (uint256)",
 "function balanceOf(address account) external view returns (uint256)",
 "function decimals() external view returns (uint8)"
];


const PresaleForm = () => {
 const [loading, setLoading] = useState(false);
 const [isVerified, setIsVerified] = useState(false);
 const [verificationStatus, setVerificationStatus] = useState('pending'); // 'pending', 'verified', 'rejected'
 const [selectedCurrency, setSelectedCurrency] = useState('ETH');
 const [amountInput, setAmountInput] = useState("");
 const [userBalance, setUserBalance] = useState("0");
 const [escrowBalance, setEscrowBalance] = useState("0");
 const [refreshingEscrow, setRefreshingEscrow] = useState(false);
 const [tokenMetadata, setTokenMetadata] = useState<Record<string, TokenMetadata>>(() => buildFallbackMetadata());
 const [totalPresaleSupply, setTotalPresaleSupply] = useState<number>(5000000000);
 const [tokensSold, setTokensSold] = useState<number>(0);
 const [canClaim, setCanClaim] = useState(false);
 const [claiming, setClaiming] = useState(false);
 const [tokenUsdPrice, setTokenUsdPrice] = useState("0.015");
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<'US' | 'Other'>('Other');
  const [tokenAmount, setTokenAmount] = useState<number>(0);
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);

  const { address, isConnected } = useAccount();
 const { signMessageAsync } = useSignMessage();
 const { data: walletClient } = useWalletClient();

 const amount = amountInput ? Number(amountInput) : 0;

 const currencyDataList = useMemo<Currency[]>(() =>
   BASE_CURRENCIES.map((base) => {
     const meta = tokenMetadata[base.address.toLowerCase()];
     return {
       name: base.name,
       symbol: base.symbol,
       iconURL: base.iconURL,
       address: base.address,
       isNative: base.isNative,
       decimals: meta?.decimals ?? base.defaultDecimals,
       priceUsd: meta?.priceUsd ?? base.fallbackPriceUsd,
       isActive: meta?.isActive ?? base.defaultActive,
     };
   }),
 [tokenMetadata]);

 const selectedCurrencyData = useMemo<Currency>(() => {
   const currency = currencyDataList.find((item) => item.symbol === selectedCurrency);
   return currency ?? currencyDataList[0];
 }, [currencyDataList, selectedCurrency]);

 useEffect(() => {
   if (!selectedCurrencyData?.isActive) {
     const firstActive = currencyDataList.find((currency) => currency.isActive);
     if (firstActive && firstActive.symbol !== selectedCurrency) {
       setSelectedCurrency(firstActive.symbol);
     }
   }
 }, [currencyDataList, selectedCurrencyData, selectedCurrency]);

useEffect(() => {
  const amount = parseFloat(amountInput || "0");
  const currencyUsd = selectedCurrencyData?.priceUsd || 0;
  const escrowUsd = parseFloat(tokenUsdPrice || "0");

  if (amount > 0 && currencyUsd > 0 && escrowUsd > 0) {
    const usdValue = amount * currencyUsd;
    const escrowTokens = usdValue / escrowUsd;
    setTokenAmount(escrowTokens);
  } else {
    setTokenAmount(0);
  }
}, [amountInput, selectedCurrencyData, tokenUsdPrice]);


const getRpcProvider = () => new JsonRpcProvider(DEFAULT_RPC_URL, DEFAULT_CHAIN_ID);

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


 // Fetch user's balance dynamically
const fetchUserBalance = useCallback(async (walletAddress: string, currency: Currency) => {
   try {
    const provider = getRpcProvider();

    if (currency.isNative) {
      const balanceWei = await provider.getBalance(walletAddress);
      const balance = formatUnits(balanceWei, currency.decimals);
      setUserBalance(parseFloat(balance).toFixed(6));
      console.log("💰 User balance:", balance, currency.symbol);
    } else {
      const code = await provider.getCode(currency.address);
      if (!code || code === "0x") {
        console.warn(`⚠️ Token contract not found for ${currency.symbol} at ${currency.address}. Defaulting balance to 0.`);
        setUserBalance("0.000000");
        return;
      }

      const tokenContract = new Contract(currency.address, ERC20_ABI, provider);
      const balanceRaw = await tokenContract.balanceOf(walletAddress);
      const balance = formatUnits(balanceRaw, currency.decimals);
      setUserBalance(parseFloat(balance).toFixed(6));
      console.log("💰 User balance:", balance, currency.symbol);
    }
   } catch (err) {
     console.error("❌ Error fetching balance:", err);
     setUserBalance("0.000000");
   }
}, []);

 const fetchTokenConfigurations = useCallback(async () => {
  if (!PRESALE_CONTRACT_ADDRESS || PRESALE_CONTRACT_ADDRESS.includes("...")) {
    setTokenMetadata(buildFallbackMetadata());
    return;
  }

  try {
    const provider = getRpcProvider();
    const presaleContract = new Contract(
      PRESALE_CONTRACT_ADDRESS,
      TOKEN_PRICE_ABI,
      provider
    );

    const metadataEntries: Record<string, TokenMetadata> = {};

    await Promise.all(
      BASE_CURRENCIES.map(async (base) => {
        const key = base.address.toLowerCase();
        let metadata: TokenMetadata = {
          priceUsd: base.fallbackPriceUsd,
          decimals: base.defaultDecimals,
          isActive: base.defaultActive,
        };

        try {
          const result = await presaleContract.getTokenPrice(base.address) as TokenPriceStruct;
          const rawPrice = Number(formatUnits(result.priceUSD, PRICE_DECIMALS));
          metadata = {
            priceUsd: rawPrice > 0 ? rawPrice : base.fallbackPriceUsd,
            decimals: Number(result.decimals) || base.defaultDecimals,
            isActive: Boolean(result.isActive),
          };
        } catch (err) {
          console.warn(`⚠️ Could not fetch token price for ${base.symbol}:`, err);
        }

        metadataEntries[key] = metadata;
      })
    );

    setTokenMetadata(metadataEntries);
  } catch (err) {
    console.error("❌ Error fetching token price data:", err);
    setTokenMetadata(buildFallbackMetadata());
  }
 }, [setTokenMetadata, PRESALE_CONTRACT_ADDRESS]);

const refreshEscrowBalance = useCallback(async () => {
  if (!address) return;
  try {
    setRefreshingEscrow(true);
    const provider = getRpcProvider();
    const presaleContract = new Contract(
      PRESALE_CONTRACT_ADDRESS,
      ["function totalPurchased(address user) view returns (uint256)"],
      provider
    );
    const balance = await presaleContract.totalPurchased(address);
    const formatted = formatUnits(balance, 18);
    setEscrowBalance(parseFloat(formatted).toFixed(6));
  } catch (err) {
    console.error("❌ Error fetching ESCROW balance:", err);
  } finally {
    setRefreshingEscrow(false);
  }
}, [address]);

 const fetchSupplyStats = useCallback(async () => {
  if (!PRESALE_CONTRACT_ADDRESS || PRESALE_CONTRACT_ADDRESS.includes("...")) {
    setTotalPresaleSupply(5000000000);
    setTokenUsdPrice("0.015");
    return;
  }

  try {
    const provider = getRpcProvider();
    const presaleContract = new Contract(PRESALE_CONTRACT_ADDRESS, SUPPLY_ABI, provider);
    const [maxTokens, mintedTokens, claimStatus, presaleRateRaw] = await Promise.all([
      presaleContract.maxTokensToMint(),
      presaleContract.totalTokensMinted(),
      presaleContract.canClaim(),
      presaleContract.presaleRate(),
    ]);

    const maxSupply = Number(formatUnits(maxTokens, 18));
    const sold = Number(formatUnits(mintedTokens, 18));
    const tokensPerUsd = Number(formatUnits(presaleRateRaw, 18));

    if (!Number.isNaN(maxSupply)) {
      setTotalPresaleSupply(maxSupply);
    }
    if (!Number.isNaN(sold)) {
      setTokensSold(sold);
    }
    setCanClaim(Boolean(claimStatus));

    if (tokensPerUsd > 0) {
      const usdPerToken = 1 / tokensPerUsd;
      setTokenUsdPrice(usdPerToken.toFixed(3));
    } else {
      setTokenUsdPrice("0.015");
    }
  } catch (err) {
    console.error("❌ Error fetching supply stats:", err);
    setTokenUsdPrice("0.015");
  }
 }, []);

 useEffect(() => {
  fetchTokenConfigurations();
  fetchSupplyStats();
}, [fetchTokenConfigurations, fetchSupplyStats]);

 // Check verification status when wallet connects or address changes
useEffect(() => {
  if (isConnected && address) {
    checkVerificationStatus(address);
    fetchUserBalance(address, selectedCurrencyData);
    refreshEscrowBalance();

    const pollInterval = setInterval(() => {
      checkVerificationStatus(address);
      fetchUserBalance(address, selectedCurrencyData);
      refreshEscrowBalance();
    }, 120000);

    return () => clearInterval(pollInterval);
  } else {
    setIsVerified(false);
    setVerificationStatus('pending');
    setUserBalance("0");
    setEscrowBalance("0");
  }
}, [isConnected, address, selectedCurrencyData, refreshEscrowBalance, fetchUserBalance]);


 const startVerification = async (countryCode: 'US' | 'Other') => {
  try {
    // 🔹 Registramos el país en backend (sin lanzar el SDK)
    await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'https://dynastical-xzavier-unsanguinarily.ngrok-free.dev'}/api/verify/start`,
      {
        userId: address,
        email: "user@example.com",
        phone: "+1234567890",
        country: countryCode === 'US' ? 'US' : 'Other',
      }
    );

    // 🔹 Mostramos pantalla de verificación (el SDK se lanza desde ahí)
    setShowVerificationScreen(true);
  } catch (err: any) {
    console.error("❌ Error starting verification:", err);
    alert(`Failed to start verification: ${err.message}`);
  }
};

  const handleVerifyClick = () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    setShowCountryModal(true);
  };


 const handleCountryConfirm = async () => {
    setShowCountryModal(false);
    const code = selectedCountry === 'US' ? 'US' : 'Other';
    // Ya no lanzamos el SDK directamente — solo mostramos la pantalla
    await startVerification(code);
  };


 const handleBuyTokens = async () => {
  
 if (!isConnected || !address) return alert("Please connect your wallet first");
  if (!amount || amount <= 0) return alert("Please enter a valid amount to purchase");
  // if (!isVerified) return alert("Please complete verification first");
 if (!selectedCurrencyData.isActive) return alert(`${selectedCurrencyData.symbol} purchases are currently disabled.`);

  console.log("💰 Purchase Request:", { amount, selectedCurrency, address });

  try {
    setLoading(true);

    // ---- Step 1: Setup ----
    if (!walletClient) throw new Error("Wallet not connected");

    const provider = getRpcProvider();
    const browserProvider = new BrowserProvider(walletClient);
    const signer = await browserProvider.getSigner();

   const isNative = selectedCurrencyData.isNative;
   const paymentToken = isNative ? NATIVE_ADDRESS : selectedCurrencyData.address;

   const numericBalance = parseFloat(userBalance || "0");
   if (numericBalance < amount) {
     setLoading(false);
     alert(`Insufficient ${selectedCurrencyData.symbol} balance to cover the selected purchase amount.`);
     return;
   }

    console.log("🔗 Payment token:", paymentToken);

    // ---- Step 2: Fetch nonce ----
    const authAddr = process.env.NEXT_PUBLIC_AUTHORIZER_CONTRACT_ADDRESS;
    if (!authAddr) throw new Error("NEXT_PUBLIC_AUTHORIZER_CONTRACT_ADDRESS not set");

    console.log("🔗 Authorizer address:", authAddr);
    console.log("🔗 User address:", address);
    console.log("🌐 Chain ID:", await provider.getNetwork());
    
    // Fetch nonce - create interface to properly encode the function call
    const iface = new Interface(AUTHORIZER_ABI);
    const encodedData = iface.encodeFunctionData('nonces', [address]);
    const result = await provider.call({
      to: authAddr,
      data: encodedData
    });
    const nonce = iface.decodeFunctionResult('nonces', result)[0];
    console.log("✅ Fetched nonce:", nonce.toString());

    const decimals = selectedCurrencyData.decimals;

    // ---- Step 4: Request voucher ----
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://dynastical-xzavier-unsanguinarily.ngrok-free.dev";

    const usdAmountValue = Number(amountInput || "0") * selectedCurrencyData.priceUsd;
    
    const { data } = await axios.post(`${apiUrl}/api/presale/voucher`, {
      buyer: address,
      beneficiary: address,
      paymentToken:paymentToken,
      usdAmount: usdAmountValue,
      userId: address,
      usernonce: nonce.toString(),
      decimals: decimals,
    });

    const { voucher, signature } = data;
    console.log("🎫 Voucher received:", { voucher, signature });

    // ---- Step 5: Contract interaction ----
    const presaleContract = new Contract(
      PRESALE_CONTRACT_ADDRESS,
      PRESALE_ABI,
      signer
    );

    const voucherStruct = [
      voucher.buyer,
      voucher.beneficiary,
      voucher.paymentToken,
      voucher.usdLimit,
      voucher.nonce,
      voucher.deadline,
      voucher.presale,
    ];

    const beneficiary = address;
    let tx;

    if (isNative) {
      // Native purchase
      const ethAmount = parseEther(amountInput);
      console.log("💰 Buying with native:", ethAmount.toString());

      tx = await presaleContract.buyWithNativeVoucher(
        beneficiary,
        voucherStruct,
        signature,
        { value: ethAmount }
      );
    } else {
      // ERC20 purchase
      const tokenContractRead = new Contract(paymentToken, ERC20_ABI, provider);
      const tokenAmount = parseUnits(amountInput, decimals);

      const allowance = await tokenContractRead.allowance(address, PRESALE_CONTRACT_ADDRESS);
      console.log("💳 Current allowance:", allowance.toString());

      if (allowance < tokenAmount) {
        console.log("🔐 Approving token spending...");
        const tokenContractWrite = new Contract(paymentToken, ERC20_ABI, signer);
        const approveTx = await tokenContractWrite.approve(PRESALE_CONTRACT_ADDRESS, tokenAmount);
        await approveTx.wait();
        console.log("✅ Approval confirmed");
      }

      tx = await presaleContract.buyWithTokenVoucher(
        paymentToken,
        tokenAmount,
        beneficiary,
        voucherStruct,
        signature
      );
    }

    console.log("⏳ Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed:", receipt);

    alert(`Purchase successful! TX: ${tx.hash}`);
    await refreshEscrowBalance();
    await fetchTokenConfigurations();
    await fetchSupplyStats();
  } catch (err: any) {
  console.error("❌ Error buying tokens:", err);
  const msg =
    err.response?.data?.error || err.reason || err.message || "Unknown error";
  alert(`Failed to buy tokens: ${msg}`);
} finally {
  setLoading(false);
}
};

const handleClaimTokens = async () => {
  if (!isConnected || !address) {
    alert("Please connect your wallet first");
    return;
  }
  if (!canClaim) {
    alert("Presale not ended yet. Claim will be available once the presale concludes.");
    return;
  }
  if (!walletClient) {
    alert("Wallet not connected");
    return;
  }

  try {
    setClaiming(true);
    const browserProvider = new BrowserProvider(walletClient);
    const signer = await browserProvider.getSigner();
    const presaleContract = new Contract(
      PRESALE_CONTRACT_ADDRESS,
      ["function claimTokens() external"],
      signer
    );

    const tx = await presaleContract.claimTokens();
    await tx.wait();

    alert("Tokens claimed successfully!");
    await refreshEscrowBalance();
    await fetchSupplyStats();
  } catch (err: any) {
    console.error("❌ Error claiming tokens:", err);
    const msg = err.reason || err.message || "Failed to claim tokens.";
    alert(msg);
  } finally {
    setClaiming(false);
  }
};


 return (
   <>
    {showVerificationScreen && (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <VerificationScreen
          userId={address ?? ""}
          countryCode={selectedCountry}
          onClose={() => {
            setShowVerificationScreen(false);
            if (address) checkVerificationStatus(address);
          }}
        />
      </div>
    )}

   <form id="presale-form" className="relative max-w-[720px] py-4 px-4 md:px-6 md:py-8 mb-4 rounded-md border border-body-text overflow-hidden">
    <FormTitle />
    <TokenPrice title="1 $ESCROW" subtitle={`$${tokenUsdPrice}`} />
     <SupplyStatus presaleSupply={totalPresaleSupply} tokensSold={tokensSold} />


     <div className="w-full h-[1px] my-4 bg-body-text rounded-full"></div>


     <h2 className="text-bg-logo font-semibold text-sm md:text-base">You deposit</h2>
     <div className="md:mb-2 mb-1 mt-2 mx-auto flex items-center justify-center flex-wrap md:gap-2 gap-1">
       {currencyDataList.slice(0, 4).map((currency) => (
         <CurrencyRadio
           key={currency.symbol}
           symbol={currency.symbol}
           iconURL={currency.iconURL}
           checked={selectedCurrency === currency.symbol}
           disabled={!currency.isActive}
           onSelect={() => setSelectedCurrency(currency.symbol)}
         />
       ))}
     </div>
     <div className="mb-3 mx-auto flex items-center justify-center flex-wrap md:gap-2 gap-1">
       <div className="flex-[0.5_1_0]"></div>
       {currencyDataList.slice(4, 7).map((currency) => (
         <CurrencyRadio
           key={currency.symbol}
           symbol={currency.symbol}
           iconURL={currency.iconURL}
           checked={selectedCurrency === currency.symbol}
           disabled={!currency.isActive}
           onSelect={() => setSelectedCurrency(currency.symbol)}
         />
       ))}
       <div className="flex-[0.5_1_0]"></div>
     </div>

     <CurrentBalance currentBalance={userBalance} currency={{ iconURL: selectedCurrencyData.iconURL, symbol: selectedCurrencyData.symbol }} />
     <CurrencyInput
       currencyBalance={userBalance}
       currencyIconURL={selectedCurrencyData.iconURL}
       currencySymbol={selectedCurrency}
       usdValue={selectedCurrencyData.priceUsd}
       value={amountInput}
       onChange={(value) => setAmountInput(value)}
     />
     <GasFee />


     <TokenPrice
        title="You will receive"
        subtitle={
          loading
            ? "Calculating..."
            : tokenAmount > 0
              ? `${tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} $ESCROW`
              : "—"
        }
      />

     <TokenBalance
       balance={escrowBalance}
       loading={refreshingEscrow}
       onRefresh={refreshEscrowBalance}
       canClaim={canClaim}
       claiming={claiming}
       onClaim={handleClaimTokens}
     />


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

    {/* 🔹 Country selection modal */}
    {showCountryModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white text-black w-[90%] max-w-sm rounded-lg p-4 shadow-xl">
          <h3 className="text-lg font-semibold mb-3">Select your country</h3>
          <label className="block text-sm mb-2">Country</label>
          <select
            className="w-full border rounded-md p-2 mb-4"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value === 'US' ? 'US' : 'Other')}
          >
            <option value="US">United States</option>
            <option value="Other">Other</option>
          </select>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-md border"
              onClick={() => setShowCountryModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-bg-logo text-bg-logo hover:bg-bg-logo hover:text-black"
              onClick={handleCountryConfirm}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    )}


     {(isConnected && isVerified) && <TermsCheckbox />}
     <img id="bg-form" src="/img/form-bg.jpg" className="absolute opacity-15 w-full h-full inset-0 -z-50" alt="" />
   </form>
    {/* <button
      type="button"
      disabled={loading || !isConnected}
      onClick={handleBuyTokens}
      className={`w-full py-3 md:py-4 mt-2 font-medium border text-sm md:text-base tracking-tight rounded-full cursor-pointer duration-200 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? 'Testing Purchase...' : 'Test Buy (dev)'}
    </button> */}
 
 </>
 );
};


export default PresaleForm;
