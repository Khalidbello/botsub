const createClient = require('./modules/mongodb.js');

async function drop () {
const client = createClient();
await client.connect();
const collection = client.db(process.env.BOTSUB_DB).collection(process.env.F_C_P);
const resp = await collection.drop();
  console.log(resp);
};

drop()