import { Currency } from "./PresaleForm";

type Props = Pick<Currency, 'symbol' | 'iconURL'> & {
  checked: boolean;
  onSelect: () => void;
  disabled?: boolean;
};

const CurencyRadio = ({ symbol, iconURL, checked, onSelect, disabled = false }: Props) => {
  const baseClasses =
    "flex-[1_1_0] inline-flex items-center justify-center px-2 py-2 sm:py-3 md:px-12 md:py-4 rounded-lg border-[1px] border-bg-logo has-[:checked]:bg-bg-logo has-[:checked]:border-bg-logo duration-200 group";
  const interactiveClasses = disabled
    ? "opacity-60 cursor-not-allowed"
    : "cursor-pointer hover:bg-bg-logo hover:border-bg-logo";
  const textHoverClass = disabled ? "" : "group-hover:text-black";

  return (
    <label className={`${baseClasses} ${interactiveClasses}`} aria-disabled={disabled}>
      <input
        className="hidden peer"
        type="radio"
        value={symbol}
        name="currency"
        checked={checked}
        disabled={disabled}
        onChange={() => {
          if (!disabled) onSelect();
        }}
      />
      <img className={`size-5 ${symbol === 'ETH' && 'border-[1px] border-body-text rounded-full'}`} src={iconURL} alt={symbol + ' logo'} />
      <span className={`text-bg-logo font-light text-[12px] sm:text-sm ml-1 tracking-tighter ${textHoverClass} peer-checked:text-black`}>
        {symbol}
      </span>
    </label>
  );
}
 
export default CurencyRadio;