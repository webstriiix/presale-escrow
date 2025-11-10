import { useState } from "react";

type Props = {
  currencyBalance: string;
  currencyIconURL: string;
  currencySymbol: string;
  usdValue: number;
  value?: string;
  onChange?: (value: string) => void;
}

const DECIMAL_REGEX = /^\d*(\.\d{0,6})?$/;

const CurrencyInput = ({ currencyBalance, currencyIconURL, currencySymbol, usdValue, value, onChange }: Props) => {

  const [internalValue, setInternalValue] = useState<string>("");
  
  // Use controlled value if provided, otherwise use internal state
  const currencyQuantity = value !== undefined ? value : internalValue;
  
  const handleChange = (newValue: string) => {
    if (!DECIMAL_REGEX.test(newValue)) return;

    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  const getUSDValue = (quantity: string) => {
    if (!quantity) return 0;
    return parseFloat(quantity) * usdValue;
  };

  const handleMaxClick = () => {
    const numericBalance = parseFloat(currencyBalance || "0");
    const maxValue = numericBalance.toFixed(6);
    handleChange(maxValue);
  };
  
  return (
    <label className="w-full flex items-center justify-center flex-nowrap px-2 py-1 my-2 border-[1px] border-body-text rounded-l-md rounded-r-lg">
      <img className="size-6 ml-2" src={currencyIconURL} alt={currencySymbol + ' logo'} />
      <div className="flex w-full mx-4 flex-col items-center justify-start">
        <input 
          className="w-full p-0 m-0 text-sm md:text-base text-bg-logo font-medium placeholder:font-light"
          type="number" 
          onChange={(e) => handleChange(e.target.value)} 
          step={'0.000001'}
          value={currencyQuantity}
          min={0}
          placeholder={'0.0'}
        />
        <span className="w-full text-[12px] md:text-sm text-bg-logo font-light text-left">$ {getUSDValue(currencyQuantity).toFixed(3)} </span>
      </div>
      <button type="button" className="font-medium bg-bg-logo text-black px-3 py-1 md:px-4 md:py-2 rounded-l-md rounded-r-md text-nowrap cursor-pointer box-border" onClick={handleMaxClick}>
        Max Amount
      </button>
    </label>
  );
}
 
export default CurrencyInput;