const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 3000
require('dotenv').config()
const morgan = require('morgan')

const jwt = require('jsonwebtoken')



// middleware 
const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(morgan('dev'))



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xd2w32h.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const usersCollection = client.db('users').collection('info')

        app.post('/user/:email', async (req, res) => {
            const info = req.body
            const email = req.params.email
            const query = { email }
            const finded = await usersCollection.findOne(query)
            if (!finded) {
                const result = await usersCollection.insertOne(info)
                res.send(result)
            } else {
                console.log('user alredy exist ');
            }

        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('server is running ')
})

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
})