[@view] function get_profit(
  const _unit           : unit;
  const s               : storage_t)
                        : nat is
  block {
    const shares_balance = get_shares_balance(s.protocol_asset_id, s.protocol, True);
    const tvl_shares = convert_amount(s.tvl, s.protocol_asset_id, s.protocol, True, False);
    const profit_shares = get_nat_or_fail(shares_balance - tvl_shares, Errors.not_nat);
    const profit = convert_amount(profit_shares, s.protocol_asset_id, s.protocol, False, True);

  } with profit