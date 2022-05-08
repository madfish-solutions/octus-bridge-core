[@view] function get_total_supply(
  const token_id        : nat;
  const s               : storage_t)
                        : nat is
  unwrap_or(s.tokens_supply[token_id], 0n)

[@view] function get_balance(
  const ledger_key      : ledger_key_t;
  const s               : storage_t)
                        : nat is
  unwrap_or(s.ledger[ledger_key], 0n)