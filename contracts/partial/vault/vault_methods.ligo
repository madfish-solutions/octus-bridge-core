function deposit(
  const params         : deposit_t;
  var s                : storage_t)
                       : return_t is
  block {
    require(not(s.paused), Errors.vault_paused);

    const result = get_or_create_asset(params.asset, (None : option(metadata_t)), s);
    var asset := result.asset;
    const asset_id = result.asset_id;
    s := result.storage;

    require(not(asset.paused), Errors.asset_paused);
    require(not(asset.banned), Errors.asset_banned);

    const deposit_without_fee = case asset.asset_type of [
    | Tez -> Tezos.amount / 1mutez
    | _ -> params.amount
    ];

    require(deposit_without_fee > 0n, Errors.zero_transfer);

    const fee = params.amount * asset.deposit_fee_f / Constants.precision;

    const deposited_amount = if fee > 0n
      then get_nat_or_fail(deposit_without_fee - fee, Errors.not_nat)
      else deposit_without_fee;

    if fee > 0n
    then {
      var fee_balance := unwrap_or(s.fee_balances[asset_id], Constants.fee_balances_mock);
      s.fee_balances[asset_id] := fee_balance with record[
          fish_f += fee * Constants.precision / 2n;
          management_f += fee * Constants.precision / 2n;
      ];
    } else skip;

    var operations := result.operations;
    case asset.asset_type of [
    | Wrapped(token_) -> {
      const burn_params : burn_params_t = record[
        token_id = token_.id;
        account = Tezos.sender;
        amount = deposit_without_fee
      ];
      operations := list[
        Tezos.transaction(
          burn_params,
          0mutez,
          unwrap(
            (Tezos.get_entrypoint_opt("%burn", token_.address) : option(contract(burn_params_t))),
            Errors.burn_etp_404)
        );
      ]
     }
    | Tez -> skip
    | _ -> {
        operations := wrap_transfer(
          Tezos.sender,
          Tezos.self_address,
          deposit_without_fee,
          asset.asset_type
        ) # operations;
      }
    ];
    asset.tvl := asset.tvl + deposited_amount;
    s.assets[asset_id] := asset;

    s.deposits[s.deposit_count] := record[
        recipient = params.recipient;
        amount    = deposited_amount;
        asset     = asset.asset_type;
    ];
    s.deposit_count := s.deposit_count + 1n;

  } with (operations, s)