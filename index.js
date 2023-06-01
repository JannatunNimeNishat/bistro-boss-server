const express = require('express');
const app = express()
const cors = require('cors');

const port = process.env.PORT || 5000;

//JWT
const jwt = require('jsonwebtoken');


//middleWare
app.use(cors())
app.use(express.json())
require('dotenv').config()

//verify the token
const verifyJWT = (req, res, next) => {

  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }
  //bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {

    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next()
  })

}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oth2isl.mongodb.net/?retryWrites=true&w=majority`;

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

    const usersCollection = client.db("bistroDb").collection('users')
    const menuCollection = client.db("bistroDb").collection('menu')
    const reviewCollection = client.db("bistroDb").collection("reviews")

    const cartCollection = client.db("bistroDb").collection("carts")


    //JWT
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
      res.send({ token })

    })




    //user related apis (CRUD)


    const verifyAdmin = async(req,res,next) =>{
     const email = req.decoded.email;
     const query = {email: email}
     const user = await usersCollection.findOne(query)
     if(user?.role !== 'admin'){
       return res.status(403).send({ error: true, message: 'forbidden request' })
     }
     next();
    }


    /** Securing a api steps:
     * 0. do not show secure links to those who should not see the links
     * 1. use jwt token: verifyJWT
     * 2. use verifyAdmin middle ware
     */





    // get all the users
    app.get('/users',verifyJWT, verifyAdmin ,async (req, res) => {
      console.log('reached');
      const result = await usersCollection.find().toArray()
      res.send(result)

    })



    //CREATE JWT
    app.post('/users', async (req, res) => {
      const user = req.body;
      // console.log(user);
      //see the user is already existing user or not
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      // console.log('existinguser ', existingUser);
      // if use is exist then it will not create a new user
      if (existingUser) {
        return res.send({ message: 'user already exist' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    })

    //checking the user is admin or not
    app.get('/users/admin/:email',verifyJWT ,async(req,res)=>{
      const email = req.params.email;
      console.log(email);
      if(req.decoded.email !== email){
        res.send({admin: false})
      }
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      const result = {admin: user?.role === 'admin'}
      res.send(result)
    })



    //PATCH update a user role (admin or normal user)
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })


    //Delete a use
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })



                         //menu related apis
    //get menu                     
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray()
      res.send(result);
    })



    //post/create menu by admin
    app.post('/menu', verifyJWT, verifyAdmin, async(req,res)=>{
      const newItem = req.body;
      const result = await menuCollection.insertOne(newItem)
      res.send(result)
    })


    //Detete a menu
    app.delete('/menu/:id', verifyJWT, verifyAdmin, async(req,res)=>{
      const id = req.params.id;
      console.log('reachd',id);
      const query= {_id: new ObjectId(id)}
      const result = await menuCollection.deleteOne(query)
      res.send(result)
    })


                //review related apis

    app.get('/reviews', async (req, res) => {

      const result = await reviewCollection.find().toArray()

      res.send(result);
    })


    //cart collection apis (add to cart operations) (CRUD)
    //READ
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;
      
      // console.log(email);
      if (!email) {
        res.send([])
      }
      //math emails 
      const decodedEmail = req.decoded.email;

      if(email !== decodedEmail){
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }

      const query = { email: email }
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })



    //CREATE
    app.post('/carts', async (req, res) => {
      const item = req.body;
      // console.log(item);
      const result = await cartCollection.insertOne(item)
      res.send(result);
    })

    //DELETE
    app.delete('/carts/:id', async (req, res) => {
      // console.log("reached");
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query);
      res.send(result)
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
  res.send('bistro boss server is running')
})

app.listen(port, () => {
  console.log(`bistro boss server is running at port: ${port}`)
})

