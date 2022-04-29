function set_owner(
  const new_address     : address;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    s.owner := new_address;
  } with (Constants.no_operations, s)

function set_round_submitter(
  const new_submitter   : address;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    s.round_submitter := new_submitter;
  } with (Constants.no_operations, s)

function set_round_ttl(
  const new_ttl         : nat;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    s.ttl_round := new_ttl;
  } with (Constants.no_operations, s)

function toggle_pause_bridge(
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    s.paused := not(s.paused);
  } with (Constants.no_operations, s)

function toggle_ban_relay(
  const relay_pk        : key;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);

    s.banned_relays[relay_pk] := not(unwrap_or(s.banned_relays[relay_pk], False));
  } with (Constants.no_operations, s)

function force_round_relay(
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

