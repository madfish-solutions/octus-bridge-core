[@view] function get_profit(
  const _unit           : unit;
  const s               : storage_t)
                        : nat is
  block {
    const shares_balance = get_shares_balance(s.protocol_asset_id, s.protocol, True);
    const current_balance = convert_amount(shares_balance, s.protocol_asset_id, s.protocol, False, False);
  } with get_nat_or_fail(current_balance - s.tvl, Errors.not_nat)