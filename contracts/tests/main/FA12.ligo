#include "../partial/IToken.ligo"

(* Helper function to get account *)
function getAccount (const addr : address; const s : storage) : account is
  case s.ledger[addr] of [
    None ->  record [
      balance    = 0n;
      allowances = (map [] : map (address, amt));
    ]
  | Some(instance) -> instance
  ]

(* Helper function to get allowance for an account *)
function getAllowance (const ownerAccount : account; const spender : address; const _s : storage) : amt is
  case ownerAccount.allowances[spender] of [
    Some (amt) -> amt
  | None -> 0n
  ];

(* Transfer token to another account *)
function transfer (const from_ : address; const to_ : address; const value : amt; var s : storage) : return is
  block {
    (* Sending to yourself? *)
    if from_ = to_ then
      failwith("InvalidSelfToSelfTransfer")
    else skip;

    (* Retrieve sender account from storage *)
    var senderAccount : account := getAccount(from_, s);

    (* Balance check *)
    if senderAccount.balance < value then
      failwith("NotEnoughBalance")
    else skip;

    (* Check this address can spend the tokens *)
    if from_ =/= Tezos.get_sender() then block {
      const spenderAllowance : amt = getAllowance(senderAccount, Tezos.get_sender(), s);

      if spenderAllowance < value then
        failwith("NotEnoughAllowance")
      else skip;

      (* Decrease any allowances *)
      senderAccount.allowances[Tezos.get_sender()] := abs(spenderAllowance - value);
    } else skip;

    (* Update sender balance *)
    senderAccount.balance := abs(senderAccount.balance - value);

    (* Update storage *)
    s.ledger[from_] := senderAccount;

    (* Create or get destination account *)
    var destAccount : account := getAccount(to_, s);

    (* Update destination balance *)
    destAccount.balance := destAccount.balance + value;

    (* Update storage *)
    s.ledger[to_] := destAccount;

  } with (noOperations, s)

(* Approve an amt to be spent by another address in the name of the sender *)
function approve (const spender : address; const value : amt; var s : storage) : return is
  block {
    if spender = Tezos.get_sender() then
      failwith("InvalidSelfToSelfApproval")
    else skip;

    (* Create or get sender account *)
    var senderAccount : account := getAccount(Tezos.get_sender(), s);

    (* Get current spender allowance *)
    // const spenderAllowance : amt = getAllowance(senderAccount, spender, s);

    (* Prevent a corresponding attack vector *)
    // if spenderAllowance > 0n and value > 0n then
    //   failwith("UnsafeAllowanceChange")
    // else skip;

    (* Set spender allowance *)
    senderAccount.allowances[spender] := value;

    (* Update storage *)
    s.ledger[Tezos.get_sender()] := senderAccount;

  } with (noOperations, s)

(* View function that forwards the balance of source to a contract *)
function getBalance (const owner : address; const contr : contract(amt); var s : storage) : return is
  block {
    const ownerAccount : account = getAccount(owner, s);
  } with (list [Tezos.transaction(ownerAccount.balance, 0tz, contr)], s)

(* View function that forwards the allowance amt of spender in the name of tokenOwner to a contract *)
function getAllowances (const owner : address; const spender : address; const contr : contract(amt); var s : storage) : return is
  block {
    const ownerAccount : account = getAccount(owner, s);
    const spenderAllowance : amt = getAllowance(ownerAccount, spender, s);
  } with (list [Tezos.transaction(spenderAllowance, 0tz, contr)], s)

(* View function that forwards the totalSupply to a contract *)
function getTotalSupply (const contr : contract(amt); var s : storage) : return is
  block {
    skip
  } with (list [Tezos.transaction(s.total_supply, 0tz, contr)], s)

(* TokenFA1.2 - Mock FA1.2 token for tests *)
function main (const action : tokenAction; var s : storage) : return is
  block {
    skip
  } with case action of [
    | Transfer(params)        -> transfer(params.0, params.1.0, params.1.1, s)
    | Approve(params)         -> approve(params.0, params.1, s)
    | GetBalance(params)      -> getBalance(params.0, params.1, s)
    | GetAllowance(params)    -> getAllowances(params.0.0, params.0.1, params.1, s)
    | GetTotalSupply(params)  -> getTotalSupply(params.1, s)
  ]