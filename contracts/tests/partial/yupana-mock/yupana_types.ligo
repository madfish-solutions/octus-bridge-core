type assetType          is
| FA12 of address
| FA2  of (address * nat)

type allowanceAmount    is [@layout:comb] record [
  src                   : address;
  amount                : nat;
]

type account            is [@layout:comb] record [
  allowances            : set(address);
  borrow                : nat;
  lastBorrowIndex       : nat;
]

type tokenType          is [@layout:comb] record [
  mainToken             : assetType;
  interestRateModel     : address;
  interestUpdateTime    : timestamp;
  priceUpdateTime       : timestamp;
  totalBorrowsF         : nat;
  totalLiquidF          : nat;
  totalSupplyF          : nat;
  totalReservesF        : nat;
  borrowIndex           : nat;
  maxBorrowRate         : nat;
  collateralFactorF     : nat;
  liquidReserveRateF    : nat;
  reserveFactorF        : nat;
  lastPrice             : nat;
  borrowPause           : bool;
  enterMintPause        : bool;
  isInterestUpdating    : bool;
  threshold             : nat;
]
type accountsMapType is big_map((address * nat), account);

type storage_t         is [@layout:comb] record [
  admin                 : address;
  admin_candidate       : option(address);
  ledger                : big_map((address * nat), nat);
  accounts              : big_map((address * nat), account);
  tokens                : big_map(nat, tokenType);
  lastTokenId           : nat;
  priceFeedProxy        : address;
  closeFactorF          : nat;
  liqIncentiveF         : nat;
  markets               : big_map(address, set(nat));
  borrows               : big_map(address, set(nat));
  maxMarkets            : nat;
  assets                : big_map(assetType, nat);
  token_metadata        : big_map(nat, token_metadata_info);
]

type return_t           is list (operation) * storage_t

type asset_params_t     is [@layout:comb] record [
  tokenId                 : nat;
  amount                  : nat;
  minReceived             : nat;
]

type asset_dl_params_t  is [@layout:comb] record [
  tokenId                 : nat;
  amount                  : nat;
  deadline                : timestamp;
]

type fa12TransferParams   is michelson_pair(
  address,
  "",
  michelson_pair(address, "", nat, ""),
  ""
)

type fa2TransferDestination is michelson_pair(
  address,
  "",
  michelson_pair(nat, "", nat, ""),
  ""
)

type fa2TransferParam       is michelson_pair(
  address,
  "",
  list(fa2TransferDestination),
  ""
)

type fa2TransferParams   is list(fa2TransferParam)


type transferType is TransferOutside of fa12TransferParams
type iterTransferType is FA2TransferOutside of fa2TransferParams


type newMetadataParams is map(string, bytes)

type updateMetadataParams is [@layout:comb] record [
  tokenId               : nat;
  token_metadata        : newMetadataParams;
]

type setModelParams     is [@layout:comb] record [
  tokenId               : nat;
  modelAddress          : address;
]

type newMarketParams    is [@layout:comb] record [
  interestRateModel     : address;
  asset                 : assetType;
  collateralFactorF     : nat;
  reserveFactorF        : nat;
  maxBorrowRate         : nat;
  token_metadata        : newMetadataParams;
  threshold             : nat;
  liquidReserveRateF    : nat;
]


[@inline] const zeroAddress : address = ("tz1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZNkiRg" : address);
[@inline] const zeroTimestamp : timestamp = (0 : timestamp);

[@inline] const token_mock = record [
      mainToken               = FA12(zeroAddress);
      interestRateModel       = zeroAddress;
      priceUpdateTime         = zeroTimestamp;
      interestUpdateTime      = zeroTimestamp;
      totalBorrowsF           = 0n;
      totalLiquidF            = 0n;
      totalSupplyF            = 0n;
      totalReservesF          = 0n;
      borrowIndex             = Constants.precision;
      maxBorrowRate           = 0n;
      collateralFactorF       = 0n;
      reserveFactorF          = 0n;
      liquidReserveRateF      = 0n;
      lastPrice               = 0n;
      borrowPause             = False;
      enterMintPause          = False;
      isInterestUpdating      = False;
      threshold               = 0n;
    ]
