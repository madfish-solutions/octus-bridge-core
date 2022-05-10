const { Parser, packDataBytes } = require("@taquito/michel-codec");

function paramToBytes({
  eventTrxLt,
  eventTimestamp,
  eventData,
  confWid,
  confAddr,
  eventContractWid,
  eventContractAddr,
  proxy,
  round,
}) {
  const parser = new Parser();
  const type = `
    (pair
      (nat %event_transaction_lt)
      (timestamp %event_timestamp)
      (bytes %event_data)
      (int %configuration_wid)
      (nat %configuration_address)
      (int %event_contract_wid)
      (nat %event_contract_address)
      (address %proxy)
      (nat %round))`;
  let data = `
    (Pair
      ${eventTrxLt}
      ${eventTimestamp}
      0x${eventData}
      ${confWid}
      ${confAddr}
      ${eventContractWid}
      ${eventContractAddr}
      "${proxy}"
      ${round})`;

  const dataJSON = parser.parseMichelineExpression(data);
  const typeJSON = parser.parseMichelineExpression(type);

  const packed = packDataBytes(dataJSON, typeJSON);

  return packed.bytes;
}

module.exports = paramToBytes;
