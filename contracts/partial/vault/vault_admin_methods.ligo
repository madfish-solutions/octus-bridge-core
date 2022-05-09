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

function set_baker(
  const new_baker       : key_hash;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations, s with record[baker = new_baker])

function set_deposit_limit(
  const value           : nat;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations, s with record[deposit_limit = value])

function set_fees(
  const new_fees        : fees_t;
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
    asset.withdraw_fee_f := params.fee_f;
    s.assets[params.asset_id] := asset;
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

