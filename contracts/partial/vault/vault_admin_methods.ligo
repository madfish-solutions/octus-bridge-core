function set_bridge(
  const new_bridge      : address;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations, s with record[bridge = new_bridge])

function set_management(
  const new_management  : address;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations, s with record[management = new_management])

function set_fish(
  const new_fish        : address;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.fish, Errors.not_fish)
  } with (Constants.no_operations, s with record[fish = new_fish])

function set_guardian(
  const new_guardian    : address;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.guardian, Errors.not_guardian)
  } with (Constants.no_operations, s with record[guardian = new_guardian])

function set_deposit_limit(
  const params          : set_deposit_limit_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    var asset := unwrap(s.assets[params.asset_id], Errors.asset_undefined);
    asset.deposit_limit := params.deposit_limit;
    s.assets[params.asset_id] := asset;
  } with (Constants.no_operations, s)

function set_fees(
  const new_fees        : vault_fees_t;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations, s with record[fees = new_fees])

function set_asset_deposit_fee(
  const params          : fee_per_asset_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    var asset:= unwrap(s.assets[params.asset_id], Errors.asset_undefined);
    asset.deposit_fee_f := params.fee_f;
    s.assets[params.asset_id] := asset;
  } with (Constants.no_operations, s)

function set_asset_withdraw_fee(
  const params          : fee_per_asset_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    var asset := unwrap(s.assets[params.asset_id], Errors.asset_undefined);
    asset.withdrawal_fee_f := params.fee_f;
    s.assets[params.asset_id] := asset;
  } with (Constants.no_operations, s)

function set_native_config(
  const config          : config_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    s.asset_config.native := config;
  } with (Constants.no_operations, s)

function set_aliens_config(
  const config          : config_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    s.asset_config.aliens := config;
  } with (Constants.no_operations, s)

function toggle_pause_vault(
  const s               : storage_t)
                        : return_t is
  block {
    if s.paused
    then require(Tezos.sender = s.owner, Errors.not_owner)
    else require(Tezos.sender = s.guardian or Tezos.sender = s.owner, Errors.not_owner_or_guardian)

  } with (Constants.no_operations, s with record[paused = not(s.paused)])

function toggle_pause_asset(
  const asset_id        : asset_id_t;
  var s                 : storage_t)
                        : return_t is
  block {
    var asset := unwrap(s.assets[asset_id], Errors.asset_undefined);
    if asset.paused
    then require(Tezos.sender = s.owner, Errors.not_owner)
    else require(Tezos.sender = s.guardian or Tezos.sender = s.owner, Errors.not_owner_or_guardian);

    s.assets[asset_id] := asset with record[paused = not(asset.paused)];
  } with (Constants.no_operations, s)

function toggle_ban_asset(
  const asset           : asset_standard_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations,
      s with record[banned_assets = Big_map.update(
        asset,
        Some(not(unwrap_or(s.banned_assets[asset], False))),
        s.banned_assets
      )])

function delegate_tez(
  const baker           : option(key_hash);
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (list[Tezos.set_delegate(baker)], s)

function claim_baker_rewards(
  const recipient       : address;
  var s                 : storage_t)
                        : return_t is
  block {
    var balance_f := unwrap_or(s.baker_rewards[Tezos.sender], 0n);

    require(balance_f / Constants.precision > 0n, Errors.zero_fee_balance);
    const reward = balance_f / Constants.precision;
    s.baker_rewards[Tezos.sender] := get_nat_or_fail(balance_f - reward * Constants.precision, Errors.not_nat);
  } with (
      list[
        wrap_transfer(
          Tezos.self_address,
          recipient,
          reward,
          Tez(unit)
        )], s)

function claim_fee(
  const params          : claim_fee_t;
  var s                 : storage_t)
                        : return_t is
  block {
    var fee_balances : fee_balances_t := unwrap(s.fee_balances[params.asset], Errors.asset_undefined);
    var balance_f := unwrap_or(fee_balances[Tezos.sender], 0n);

    require(balance_f / Constants.precision > 0n, Errors.zero_fee_balance);
    const reward = balance_f / Constants.precision;
    fee_balances[Tezos.sender] := get_nat_or_fail(balance_f - reward * Constants.precision, Errors.not_nat);
    s.fee_balances[params.asset] := fee_balances;
  } with (list[
      wrap_transfer(
        Tezos.self_address,
        params.recipient,
        reward,
        params.asset
      )], s)
