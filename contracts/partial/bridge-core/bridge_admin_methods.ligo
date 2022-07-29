function set_round_submitter(
  const new_submitter   : address;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.get_sender() = s.owner, Errors.not_owner)
  } with (Constants.no_operations, s with record[round_submitter = new_submitter])

function set_round_ttl(
  const new_ttl         : nat;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.get_sender() = s.owner, Errors.not_owner)
   } with (Constants.no_operations, s with record[ttl = new_ttl])

function set_min_required_signatures(
  const new_value       : nat;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.get_sender() = s.owner, Errors.not_owner);

   } with (Constants.no_operations, s with record[min_required_signatures = new_value])

function set_configuration(
  const params          : config_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.get_sender() = s.owner, Errors.not_owner)
   } with (Constants.no_operations, s with record[
        configuration_address = params.configuration_address;
        configuration_wid = params.configuration_wid
      ])

function toggle_pause_bridge(
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.get_sender() = s.owner, Errors.not_owner)
  } with (Constants.no_operations, s with record[paused = not(s.paused)])

function toggle_ban_relay(
  const relay_pk        : key;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.get_sender() = s.owner, Errors.not_owner)
  } with (Constants.no_operations,
      s with record[banned_relays = Big_map.update(
        relay_pk,
        Some(not(unwrap_or(s.banned_relays[relay_pk], False))),
        s.banned_relays
      )])

function force_round_relay(
  const params          : force_round_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.get_sender() = s.round_submitter, Errors.not_submitter);
    require(not(s.paused), Errors.bridge_paused);

    const new_round = record[
        end_time = params.end_time;
        ttl      = params.end_time + int(s.ttl);
        relays   = params.relays;
        required_signatures = get_required_signatures(
            params.relays, s.min_required_signatures)
    ];
    s.last_round := s.last_round + 1n;
    s.rounds[s.last_round] := new_round;

  } with (Constants.no_operations, s)

