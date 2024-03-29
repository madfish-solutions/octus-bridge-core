(* Set new pending admin *)
function update_admin(
  var s                 : storage_type;
  const new_admin       : address)
                        : storage_type is
  block {
    (* Ensure sender has the admin permissions *)
    if Tezos.get_sender() =/= s.admin
    then failwith("NOT_ADMIN")
    else skip;

    (* Update storage *)
    s.admin := new_admin;
  } with s

(* Update minter permissions *)
function update_minter(
  var s                 : storage_type;
  const param           : update_minter_param)
                        : storage_type is
  block {
    if Tezos.get_sender() =/= s.admin
    then failwith("NOT_ADMIN")
    else skip;

    // if param.percent < 1n or param.percent > 100n
    // then failwith("WRONG_PERCENT")
    // else skip;

    (* Update storage *)
    if param.allowed then {
      s.minters := Set.add(param.minter, s.minters);
      var mt : minter_type := record [
        minter  = param.minter;
        percent = param.percent;
      ];
      s.minters_info := Set.add(mt, s.minters_info);
      s.total_mint_percent := s.total_mint_percent + param.percent;
    }
    else {
      var mt : minter_type := record [
          minter  = param.minter;
          percent = param.percent;
      ];
      s.minters_info := Set.remove(mt, s.minters_info);
      s.minters := Set.remove(param.minter, s.minters);
      s.total_mint_percent := abs(s.total_mint_percent - param.percent);
    }
  } with s
