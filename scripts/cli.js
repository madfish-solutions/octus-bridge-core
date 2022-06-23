require("dotenv").config();

const yargs = require("yargs");
const {
  compile,
  compileTest,
  runMigrations,
  compileLambdas,
} = require("./helpers");

const argv = yargs
  .command(
    "compile [contract]",
    "compiles the contract",
    {
      contract: {
        description: "the contract to compile",
        alias: "c",
        type: "string",
      },
    },
    async argv => {
      compile(argv.contract, argv.type);
    },
  )
  .command(
    "compileTest [contract]",
    "compiles the contract",
    {
      contract: {
        description: "the contract to compile",
        alias: "c",
        type: "string",
      },
      type: {
        description: "the michelson type",
        alias: "t",
        type: "string",
      },
    },
    async argv => {
      compileTest(argv.contract, argv.type);
    },
  )
  .command(
    "compile-lambda [json] [contract]",
    "compile lambdas for the specified contract",
    {
      json: {
        description:
          "input file relative path (with lambdas indexes and names)",
        alias: "j",
        type: "string",
      },
      contract: {
        description: "input file realtive path (with lambdas Ligo code)",
        alias: "c",
        type: "string",
      },
    },
    async argv => {
      compileLambdas(argv.json, argv.contract);
    },
  )
  .command(
    "migrate [network] [from] [to]",
    "run migrations",
    {
      from: {
        description: "the migrations counter to start with",
        alias: "f",
        type: "number",
      },
      to: {
        description: "the migrations counter to end with",
        alias: "to",
        type: "number",
      },
      network: {
        description: "the network to deploy",
        alias: "n",
        type: "string",
      },
    },
    async argv => {
      runMigrations(argv);
    },
  )
  .help()
  .strictCommands()
  .demandCommand(1)
  .alias("help", "h").argv;
