[@inline] function set_round_submitter(
  const new_submitter   : address;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations, s with record[round_submitter = new_submitter])

[@inline] function set_round_ttl(
  const new_ttl         : nat;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
   } with (Constants.no_operations, s with record[ttl_round = new_ttl])

[@inline] function toggle_pause_bridge(
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations, s with record[paused = not(s.paused)])

[@inline] function toggle_ban_relay(
  const relay_pk        : key;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations,
      s with record[banned_relays = Big_map.update(
        relay_pk,
        Some(not(unwrap_or(s.banned_relays[relay_pk], False))),
        s.banned_relays
      )])

[@inline] function force_round_relay(
  const params          : force_new_round_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.round_submitter, Errors.not_submitter);
    require(not(s.paused), Errors.bridge_paused);

    const new_round = record[
        end_time        = params.end_time;
	      ttl_round       = params.end_time + int(s.ttl_round);
	      relays_keys     = params.relays_keys;
        validate_quorum = params.validate_quorum;
    ];
    s.rounds[s.round_count] := new_round;
    s.round_count := s.round_count + 1n;
  } with (Constants.no_operations, s)

