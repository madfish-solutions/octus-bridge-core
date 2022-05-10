const { Parser, packDataBytes } = require("@taquito/michel-codec");

function paramToBytes({ endTime, relays, requiredSignatures }) {
  const parser = new Parser();
  const type = `
    (pair
      (timestamp %end_time)
      (set %relays key)
      (nat %required_signatures))`;
  let data = `
    (Pair
      ${endTime}
      {${relays}}
      ${requiredSignatures})`;

  const dataJSON = parser.parseMichelineExpression(data);
  const typeJSON = parser.parseMichelineExpression(type);

  const packed = packDataBytes(dataJSON, typeJSON);

  return packed.bytes;
}

module.exports = paramToBytes;
