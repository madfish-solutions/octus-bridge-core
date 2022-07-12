function get_or_create_asset(
  const asset_type      : asset_standard_t;
  const metadata        : option(token_meta_t);
  var s                 : storage_t)
                        : get_asset_return_t is
  block {
    var asset := Constants.asset_mock;
    var operations := no_operations;
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

        require_none(s.assets[asset_id], Errors.failed_create_asset);
        asset.asset_type := asset_type;
        case asset_type of [
        | Wrapped(token_) -> {
            asset.deposit_fee_f  := s.fees.native.deposit_f;
            asset.withdrawal_fee_f := s.fees.native.withdraw_f;

            const meta = unwrap(metadata, Errors.metadata_undefined);

            operations := Tezos.transaction(
                meta,
                0mutez,
                unwrap(
                  (Tezos.get_entrypoint_opt("%create_token", token_.address) : option(contract(token_meta_t))),
                  Errors.create_token_etp_404
                )
            ) # operations;
          }
        | _ -> {
            asset.deposit_fee_f  := s.fees.alien.deposit_f;
            asset.withdrawal_fee_f := s.fees.alien.withdraw_f;
          }
        ];
        s.assets[asset_id] := asset;
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

function ensure_withdraw_valid(
  const message         : message_t;
  const bridge          : address)
                        : unit is
  case unwrap(
      (Tezos.call_view("validate_message", message, bridge) : option(message_status_t)),
      Errors.validate_message_view_404
    ) of [
  | Round_greater_last_round      -> failwith(Errors.round_greater_last_round)
  | Round_less_initial_round      -> failwith(Errors.round_less_initial_round)
  | Not_enough_correct_signatures -> failwith(Errors.not_enough_signatures)
  | Round_outdated                -> failwith(Errors.round_outdated)
  | Bridge_paused                 -> failwith(Errors.bridge_paused)
  | Invalid_payload               -> failwith(Errors.invalid_payload)
  | Message_valid                 -> unit
  ]

function update_fee_balances(
  var fee_balances_map  : fee_balances_map_t;
  const fish            : address;
  const management      : address;
  const fee             : nat;
  const asset_id        : asset_id_t)
                        : fee_balances_map_t is
  block {
    var fee_balances := unwrap_or(fee_balances_map[asset_id], Constants.fee_balances_mock);
    const fish_balance_f = unwrap_or(fee_balances[fish], 0n);
    const management_balance_f = unwrap_or(fee_balances[management], 0n);
    const half_fee_f = fee * Constants.precision / 2n;
    fee_balances[fish] := fish_balance_f + half_fee_f;
    fee_balances[management] := management_balance_f + half_fee_f;
    fee_balances_map[asset_id] := fee_balances;
  } with fee_balances_map

function get_harvest_op(
  const strategy_address : address)
                         : operation is
  Tezos.transaction(
      unwrap(
        (Tezos.get_entrypoint_opt("%handle_harvest", Tezos.get_self_address()) : option(contract(harvest_response_t))),
        Errors.handle_harvest_etp_404
      ),
      0mutez,
      unwrap(
        (Tezos.get_entrypoint_opt("%harvest", strategy_address) : option(contract(contract(harvest_response_t)))),
        Errors.harvest_etp_404
      ));

function get_divest_op(
  const amount_          : nat;
  const strategy_address : address)
                         : operation is
  Tezos.transaction(
      amount_,
      0mutez,
      unwrap(
        (Tezos.get_entrypoint_opt("%divest", strategy_address) : option(contract(nat))),
        Errors.divest_etp_404
      ));

function get_invest_op(
  const amount_          : nat;
  const strategy_address : address)
                         : operation is
  Tezos.transaction(
      amount_,
      0mutez,
      unwrap(
        (Tezos.get_entrypoint_opt("%invest", strategy_address) : option(contract(nat))),
        Errors.invest_etp_404
      ));

[@inline] function get_nat_or_zero(
  const value           : int)
                        : nat is
  case is_nat(value) of [
  | Some(natural) -> natural
  | None -> 0n
  ]

function reverse_list<t>(
  const lst             : list(t))
                        : list(t) is
  List.fold(
    function(
      const lst         : list(t);
      const op          : t)
                        : list(t) is
      op # lst,
    lst,
    (nil : list(t))
  )