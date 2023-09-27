const { MongoClient, ServerApiVersion } = require('mongodb');

//const uri = `mongodb+srv://bellokhalid74:${process.env.MONGO_PASS1}@botsubcluster.orij2vq.mongodb.net/?retryWrites=true&w=majority`;
const uri = process.env.DB_CONNECTION_STR;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
function createClient() {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  return client;
} // end of createClient

module.exports = createClient;
