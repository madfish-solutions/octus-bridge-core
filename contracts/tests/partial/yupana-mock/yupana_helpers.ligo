function getFA12Transfer(
  const tokenAddress    : address)
                        : contract(transferType) is
  unwrap(
    (Tezos.get_entrypoint_opt("%transfer", tokenAddress)
                        : option(contract(transferType))),
    Errors.wrongContract
  );

function getFA2Transfer(
  const tokenAddress    : address)
                        : contract(iterTransferType) is
  unwrap(
    (Tezos.get_entrypoint_opt("%transfer", tokenAddress)
                        : option(contract(iterTransferType))),
    Errors.wrongContract
  );

function wrap_fa12_transfer_trx(
  const from_           : address;
  const to_             : address;
  const amt             : nat)
                        : transferType is
  TransferOutside((from_, (to_, amt)))

function wrap_fa2_transfer_trx(
  const from_           : address;
  const to_             : address;
  const amt             : nat;
  const id              : nat)
                        : iterTransferType is
  FA2TransferOutside(list[(from_, list[
        (to_, (id, amt))
    ])])

function transfer_fa12(
  const from_           : address;
  const to_             : address;
  const amt             : nat;
  const token           : address)
                        : list(operation) is
  list[Tezos.transaction(
    wrap_fa12_transfer_trx(from_, to_, amt),
    0mutez,
    getFA12Transfer(token)
  )];

function transfer_fa2(
  const from_           : address;
  const to_             : address;
  const amt             : nat;
  const token           : address;
  const id              : nat)
                        : list(operation) is
  list[Tezos.transaction(
    wrap_fa2_transfer_trx(from_, to_, amt, id),
    0mutez,
    getFA2Transfer(token)
  )];

function transfer_token(
  const from_           : address;
  const to_             : address;
  const amt             : nat;
  const token           : assetType)
                        : list(operation) is
  case token of [
    FA12(token) -> transfer_fa12(from_, to_, amt, token)
  | FA2(token)  -> transfer_fa2(from_, to_, amt, token.0, token.1)
  ]

[@inline] function ceil_div(
  const numerator       : nat;
  const denominator     : nat)
                        : nat is
  case ediv(numerator, denominator) of [
    Some(result) -> if result.1 > 0n
      then result.0 + 1n
      else result.0
  | None -> failwith(Errors.ceilDivision)
  ]

function getAccount(
  const user            : address;
  const tokenId         : nat;
  const accounts        : big_map((address * nat), account))
                        : account is
  case accounts[(user, tokenId)] of [
    None -> record [
      allowances        = (set [] : set(address));
      borrow            = 0n;
      lastBorrowIndex   = 0n;
    ]
  | Some(v) -> v
  ]

function getTokenIds(
  const user            : address;
  const addressMap      : big_map(address, set(nat)))
                        : set(nat) is
  case addressMap[user] of [
    None -> (set [] : set(nat))
  | Some(v) -> v
  ]