type Props = {
  balance: string;
  loading: boolean;
  onRefresh: () => void;
  canClaim?: boolean;
  claiming?: boolean;
  onClaim?: () => void;
};

const TokenBalance = ({
  balance,
  loading,
  onRefresh,
  canClaim = false,
  claiming = false,
  onClaim,
}: Props) => {
  const claimDisabled = claiming || loading;
  const claimLocked = !canClaim;

  return (
    <div className="w-full py-4 md:py-6 px-3 md:px-4 flex items-center justify-between gap-3 bg-gray/5 tracking-tight rounded-l-md rounded-r-md">
      <div className="flex flex-col">
        <span className="text-bg-logo text-[14px] md:text-sm font-medium">Your $ESCROW balance</span>
        <span className="text-bg-logo text-[14px] md:text-sm font-medium">{balance} $ESCROW</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="px-3 py-2 text-xs md:text-sm border border-bg-logo text-bg-logo rounded-full hover:bg-bg-logo hover:text-black duration-200 disabled:opacity-50"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        {onClaim && (
          <button
            type="button"
            className={`px-3 py-2 text-xs md:text-sm rounded-full duration-200 ${
              claimLocked
                ? 'border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black'
                : 'border border-green-500 text-green-500 hover:bg-green-500 hover:text-black'
            } ${claimDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={onClaim}
            disabled={claimDisabled}
          >
            {claiming ? 'Claiming...' : claimLocked ? 'Claim Locked' : 'Claim Tokens'}
          </button>
        )}
      </div>
    </div>
  );
};

export default TokenBalance;