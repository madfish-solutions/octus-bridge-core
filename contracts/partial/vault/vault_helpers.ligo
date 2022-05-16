function get_or_create_asset(
  const asset_type      : asset_standard_t;
  const metadata        : option(metadata_t);
  var s                 : storage_t)
                        : get_asset_return_t is
  block {
    var asset := Constants.asset_mock;
    var operations := Constants.no_operations;
    var asset_id := 0n;
    case s.asset_ids[asset_type] of [
    | Some(id) -> {
        asset_id := id;
        asset := unwrap(s.assets[asset_id], Errors.asset_undefined)
      }
    | None -> {
        s.asset_ids[asset_type] := s.asset_count;
        asset_id := s.asset_count;
        s.asset_count := s.asset_count + 1n;

        case s.assets[asset_id] of [
        | Some(_) -> failwith(Errors.failed_create_asset)
        | None -> {
            asset.asset_type := asset_type;
            case asset_type of [
            | Wrapped(token_) -> {
                asset.deposit_fee_f  := s.fees.aliens.deposit_f;
                asset.withdraw_fee_f := s.fees.aliens.withdraw_f;

                const meta = unwrap(metadata, Errors.metadata_undefined);

                operations := Tezos.transaction(
                    meta,
                    0mutez,
                    unwrap(
                      (Tezos.get_entrypoint_opt("%create_token", token_.address) : option(contract(metadata_t))),
                      Errors.create_token_etp_404
                    )
                  ) # operations;
              }
            | _ -> {
                asset.deposit_fee_f  := s.fees.native.deposit_f;
                asset.withdraw_fee_f := s.fees.native.withdraw_f;
              }
            ];
            s.assets[asset_id] := asset;
          }
        ]
      }
    ];
   
  } with record[
        storage = s;
        asset = asset;
        asset_id = asset_id;
        operations = operations]

function wrap_transfer(
  const sender_          : address;
  const recipient         : address;
  const amount_          : nat;
  const token            : asset_standard_t)
                         : operation is
    case token of [
    | Fa12(address_) -> Tezos.transaction(
        (sender_,
        (recipient, amount_)),
        0mutez,
        unwrap(
          (Tezos.get_entrypoint_opt("%transfer", address_) : option(contract(fa12_transfer_t))),
          Errors.transfer_etp_404))
    | Fa2(token_) -> transfer_fa2(
        sender_,
        recipient,
        amount_,
        token_.id,
        token_.address)
    | Tez -> Tezos.transaction(
        unit,
        amount_ * 1mutez,
        (Tezos.get_contract_with_error(recipient, Errors.implict_account_404) : contract(unit)))
    | Wrapped(token_) -> transfer_fa2(
        sender_,
        recipient,
        amount_,
        token_.id,
        token_.address)
    ]
