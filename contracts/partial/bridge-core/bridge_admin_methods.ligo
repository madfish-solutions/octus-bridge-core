[@inline] function set_round_submitter(
  const new_submitter   : address;
  var s                 : storage_t)
                        : storage_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    s.round_submitter := new_submitter;
  } with s

[@inline] function set_round_ttl(
  const new_ttl         : nat;
  var s                 : storage_t)
                        : storage_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    s.ttl_round := new_ttl;
  } with s

[@inline] function toggle_pause_bridge(
  var s                 : storage_t)
                        : storage_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    s.paused := not(s.paused);
  } with s

[@inline] function toggle_ban_relay(
  const relay_pk        : key;
  var s                 : storage_t)
                        : storage_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);

    s.banned_relays[relay_pk] := not(unwrap_or(s.banned_relays[relay_pk], False));
  } with s

[@inline] function force_round_relay(
  const params          : force_new_round_t;
  var s                 : storage_t)
                        : storage_t is
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
  } with s

