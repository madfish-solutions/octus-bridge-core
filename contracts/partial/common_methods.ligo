function common_set_owner(
  const new_address     : address;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.get_sender() = s.owner, Errors.not_owner)
  } with ((nil: list(operation)), s with record[pending_owner = Some(new_address)])

function common_confirm_owner(
  var s                 : storage_t)
                        : return_t is
  block {
    const pending = unwrap(s.pending_owner, Errors.not_pending_owner);
    require(Tezos.get_sender() = pending, Errors.not_pending_owner);
    s.owner := pending;
    s.pending_owner := (None : option(address));
  } with ((nil: list(operation)), s)

function common_update_metadata(
  const params          : metadata_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.get_sender() = s.owner, Errors.not_owner)
  } with ((nil: list(operation)), s with record[metadata = params])