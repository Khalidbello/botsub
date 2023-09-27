const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://bellokhalid74:${process.env.MONGO_PASS1}@botsubcluster.orij2vq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
async function closeAllConnections() {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  try {
    await client.connect();

    //Get the admin database
    const adminDb = client.db(process.env.BOTSUB_DB);

    // Shut down the server to close all connections
    await adminDb.command({ shutdown: 1 });
    console.log('All connections closed.');

  } catch (error) {
    console.error('Error closing connections:', error);
  } finally {
    // Always close the client after you're done
    await client.close();
  }
}

closeAllConnections();

