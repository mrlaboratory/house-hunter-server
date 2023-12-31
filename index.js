const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 3000
require('dotenv').config()
const morgan = require('morgan')

const jwt = require('jsonwebtoken')

// to do , use try catch for error handle 

// middleware 
const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(morgan('dev'))



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const housesCollection = client.db('houses').collection('data')
        const bookingCollection = client.db('booking').collection('data')

        // session token genrate 
        const session = info => {
            const token = jwt.sign({ email: info.email, name: info.name }, process.env.SECRET_KEY, { expiresIn: '2h' })
            return token
        }

        const verifyJWT = (req, res, next) => {
            const authorization = req.headers.authorization
            if (!authorization) {
                return res.status(401).send({ error: true, message: 'unauthorized access' })

            }
            const token = authorization.split(' ')[1]
            jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
                if (err) {
                    return res
                        .status(401)
                        .send({ error: true, message: 'Unauthorized access' })
                }
                console.log(decoded);
                req.decoded = decoded
                next()
            })
        }

        // register user || to add new user data 
        app.post('/register/:email', async (req, res) => {
            try {
                const info = req.body
                console.log(info);
                const email = req.params.email
                const query = { email }
                const finded = await usersCollection.findOne(query)
                if (!finded) {
                    const result = await usersCollection.insertOne(info)
                    if (result.insertedId) {
                        const token = session(info)
                        res.send({ token })
                    }
                } else {
                    console.log('user alredy exist ');
                    res.send({ error: true, message: 'User already exist , Please login ' })
                }

            } catch (error) {
                console.log(error);
            }
        })


        // login user 
        app.post('/login/:email', async (req, res) => {
            try {
                const body = req.body
                const email = req.params.email
                const password = body.password
                const query = { email }
                const findUser = await usersCollection.findOne(query)
                if (findUser) {
                    if (findUser.password === password) {
                        const token = session(body)
                        res.send({ token })
                    } else {
                        console.log('Password does not match !!');
                        res.send({ error: true, message: 'Password does not match !! ' })
                    }
                } else {
                    console.log('user not found');
                    res.send({ error: true, message: 'User not found !! ' })
                }
            } catch (error) {
                console.log(error);
            }
        })


        // get user data 
        app.get('/userData', verifyJWT, async (req, res) => {
            try {
                const email = req.decoded.email
                const query = { email }
                const result = await usersCollection.findOne(query)
                res.send(result)
            } catch (error) {
                console.log(error);
            }
        })


        // add new house data 
        app.post('/addnewhouse', async (req, res) => {
            try {
                const houseInfo = req.body
                const result = await housesCollection.insertOne(houseInfo)
                res.send(result)

            } catch (error) {
                console.log(error);
            }
        })

        // get all houses 
        app.get('/houses', async (req, res) => {
            try {
                const text = req.query.text || ''
                const city = req.query.city || ''

                const rentValue = parseInt(req?.query?.rent) || 10000
                const bedroomsValue = parseInt(req?.query?.bedrooms) || 50
                const bathroomsValue = parseInt(req?.query?.bathrooms) || 50
                const sizeValue = parseInt(req?.query?.size) || 50
                const regex = new RegExp(text, 'i');


                const result = await housesCollection.find({ name: regex }).toArray()
                const result2 = result?.filter((d) => {
                    return d.rent <= rentValue && d.bedrooms <= bedroomsValue && d.bathrooms <= bathroomsValue && d.romeSize <= sizeValue && d.city.toLowerCase().includes(city.toLowerCase())
                })

                res.send(result2)
            } catch (error) {
                console.log(error);
            }
        })

        // houses by email 
        app.get('/housesByEmail/:email', async (req, res) => {
            try {
                const email = req.params.email
                const query = { ownerEmail: email }
                const result = await housesCollection.find(query).toArray()
                res.send(result)
            } catch (error) {
                console.log(error);
            }
        })

        // delete house
        app.delete('/housedelete/:id', verifyJWT, async (req, res) => {
            try {
                const id = req.params.id
                const query = { _id: new ObjectId(id) }
                const result = await housesCollection.deleteOne(query)
                res.send(result)
            } catch (error) {
                console.log(error);
            }
        })


        // update hosue
        app.patch('/houseupdate/:id', verifyJWT, async (req, res) => {
            try {
                const id = req.params.id
                const query = { _id: new ObjectId(id) }
                const info = req.body
                const newDoc = {
                    $set: { ...info }
                }
                const result = await housesCollection.updateOne(query, newDoc)
                res.send(result)
            } catch (error) {
                console.log(error);
            }
        })


        // total house 
        app.get('/allhouse', async (req, res) => {
            try {
                const page = parseInt(req?.query?.page) || 0
                const limit = parseInt(req?.query?.limit) || 10
                const skip = page * limit
                const result = await housesCollection.find().skip(skip).limit(limit).toArray()

                res.send(result)
            } catch (error) {
                console.log(error);
            }
        })


        // all house 
        app.get('/totalhouses', async (req, res) => {
            try {
                const result = await housesCollection.estimatedDocumentCount()
                console.log(result);
                res.send({ totalHouses: result })
            } catch (error) {
                console.log(error);
            }
        })


        // for house booking 
        app.post('/bookinghouse', verifyJWT, async (req, res) => {
            try {
                const info = req.body
                const bookedBy = req.body.bookedBy
                const query = { bookedBy }
                console.log(query);
                const ress = await bookingCollection.find(query).toArray()
                console.log(ress?.length);
                if (ress?.length > 1) {
                    res.send({ error: true, message: 'Maximum booking limit exceeded, A renter only booked 2 houses !!' })
                } else {
                    const result = await bookingCollection.insertOne(info)
                    res.send(result)
                }
            } catch (error) {
                console.log(error);
            }

        })


        // for booked data 
        app.get('/bookedByUser/:email', async (req, res) => {
            try {
                const bookedBy = req.params.email
                const query = { bookedBy }
                const bookedData = await bookingCollection.find(query).toArray()
                const houses = await housesCollection.find().toArray()
                res.send(bookedData)
            } catch (error) {
                console.log(error);
            }
        })
        // owner booked houses
        app.get('/bookedByOwner/:email', async (req, res) => {
            try {
                const ownerEmail = req.params.email
                const query = { ownerEmail }
                console.log(query);
                const bookedData = await bookingCollection.find(query).toArray()
                console.log(bookedData);
                const houses = await housesCollection.find().toArray()
                res.send(bookedData)
            } catch (error) {
                console.log(error);
            }
        })

        app.delete('/removebooking/:id', async (req, res) => {
            try {
                const id = req.params.id
                const query = { _id: new ObjectId(id) }
                const result = await bookingCollection.deleteOne(query)
                res.send(result)

            } catch (error) {
                console.log(error);
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