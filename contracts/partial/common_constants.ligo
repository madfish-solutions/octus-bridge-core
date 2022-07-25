module Constants is {
  const default_token_id  : token_id_t = 0n;
  const no_operations     : list(operation) = nil;
  const empty_allowances  : set(address) = set[];
  const precision         : nat = 1_000_000n;
  const zero_address      : address = ("tz1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZNkiRg" : address);
  const asset_mock        : asset_t = record[
    asset_type      = Fa12(zero_address);
    deposit_fee_f   = 0n;
    withdrawal_fee_f  = 0n;
    deposit_limit   = 0n;
    tvl             = 0n;
    virtual_balance = 0n;
    paused          = False;
    banned          = False;
  ];
  const fee_balances_mock : fee_balances_t = map[];
  const chain_id : bytes = 0x05010000000f4e6574586451707263566b70615755;
}