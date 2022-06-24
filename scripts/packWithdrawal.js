const { Parser, packDataBytes } = require("@taquito/michel-codec");

function paramToBytes({
  depositId,
  amount,
  recipient,
  assetType,
  assetAddress,
  assetId = 0,
  bounty = 0,
  metadata = null,
}) {
  const parser = new Parser();
  const type = `
    (pair
      (bytes %deposit_id)
      (or %asset
        (or (address %fa12) (pair %fa2 (address %address) (nat %id)))
        (or (unit %tez) (pair %wrapped (address %address) (nat %id))))
      (nat %amount)
      (address %recipient)
      (nat %bounty)
      (option %metadata (map string bytes)))`;
  let data;
  switch (assetType) {
    case "FA12":
      data = `
        (Pair 0x${depositId}
        (Left (Left "${assetAddress}"))
        ${amount}
        "${recipient}"
        ${bounty}
        None)`;
      break;
    case "FA2":
      data = `
        (Pair 0x${depositId}
        (Left (Right (Pair "${assetAddress}" ${assetId})))
        ${amount}
        "${recipient}"
        ${bounty}
        None)`;
      break;
    case "TEZ":
      data = `
      (Pair 0x${depositId}
      (Right (Left Unit))
      ${amount}
      "${recipient}"
      ${bounty}
      None)`;
      break;
    case "WRAPPED":
      if (metadata) {
        data = `
        (Pair 0x${depositId}
        (Right (Right (Pair "${assetAddress}" ${assetId})))
        ${amount}
        "${recipient}"
        ${bounty}
        (Some { Elt "symbol" 0x${metadata.symbol} ;
                
              }))`;
      } else {
        data = `
        (Pair 0x${depositId}
        (Right (Right (Pair "${assetAddress}" ${assetId})))
        ${amount}
        "${recipient}"
        ${bounty}
        None)`;
      }
      break;
  }

  const dataJSON = parser.parseMichelineExpression(data);
  const typeJSON = parser.parseMichelineExpression(type);

  const packed = packDataBytes(dataJSON, typeJSON);

  return packed.bytes;
}

module.exports = paramToBytes;
