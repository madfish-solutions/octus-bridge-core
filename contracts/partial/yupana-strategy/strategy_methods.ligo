function invest(
  const params            : invest_t;
  var s                   : storage_t)
                          : return_t is
  block {
    require(Tezos.sender = s.vault, Errors.not_vault);
  } with (
      list[
        Tezos.transaction(
          (record[
            tokenId     = s.protocol_asset_id;
            amount      = params.amount;
            minReceived = params.min_received;
          ] : y_mint_t),
          0mutez,
          unwrap(
            (Tezos.get_entrypoint_opt("%mint", s.protocol) : option(contract(y_mint_t))),
            Errors.mint_etp_404
          )
        );
        get_balance_op(s.protocol_asset_id, s.protocol)
      ], s)

function handle_balance(
  const response          : list (balance_of_response_t);
  const s                 : storage_t)
                          : return_t is
  block {
    require(Tezos.sender = s.protocol, Errors.sender_not_protocol);
    require(Tezos.source = s.vault, Errors.source_not_vault);
    const amount_ = case List.head_opt(response) of [
    | Some (response_) -> response_.balance
    | None -> 0n
    ];
  } with (Constants.no_operations, s with record[balance += amount_])