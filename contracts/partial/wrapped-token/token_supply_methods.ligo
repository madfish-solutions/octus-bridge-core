(* Perform minting new tokens *)
function mint (
  const params          : mint_params_t;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.get_sender() = s.vault, Errors.not_vault);

    function make_mint(
      var s             : storage_t;
      const param       : mint_param_t)
                        : storage_t is
      block {
        require(param.token_id < s.token_count, Errors.fa2_token_undefined);

        const destination_key = (param.recipient, param.token_id);
        const destination_balance = unwrap_or(s.ledger[destination_key], 0n);

        (* Mint new tokens *)
        s.ledger[destination_key] := destination_balance + param.amount;

        const token_supply = unwrap_or(s.tokens_supplies[param.token_id], 0n);

        (* Update token total supply *)
        s.tokens_supplies[param.token_id] := token_supply + param.amount;
      } with s
  } with (Constants.no_operations, List.fold(make_mint, params, s))

function create_token(
  const new_token       : new_token_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.get_sender() = s.vault, Errors.not_vault);

    s.token_metadata[s.token_count] := record [
      token_id = s.token_count;
      token_info = new_token;
    ];

    s.token_count := s.token_count + 1n;
  } with (Constants.no_operations, s)

function burn(
  const params          : burn_params_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.get_sender() = s.vault, Errors.not_vault);

    const ledger_key = (params.account, params.token_id);
    const account_balance = unwrap_or(s.ledger[ledger_key], 0n);

    const token_supply = unwrap(s.tokens_supplies[params.token_id], Errors.token_undefined);
    s.tokens_supplies[params.token_id] := get_nat_or_fail(token_supply - params.amount, Errors.not_nat);

    s.ledger[ledger_key] := get_nat_or_fail(account_balance - params.amount, Errors.fa2_low_balance);
  } with (Constants.no_operations, s)