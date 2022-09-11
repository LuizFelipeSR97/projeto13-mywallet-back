import axios from 'axios';
import express from 'express';
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Models or Schemas (JOI)

//user example:

/* {
    name : "john", 
    email : "john@driven.com", 
    password : "johndriven" 
} */

const userSchema = joi.object({
    name: joi.string().required,
    email: joi.string().required,
    password: joi.string().required
})

//transaction example:

/* {
    idUser: "631a03226141464d5f549a40", 
    description: "teste", 
    value: 200, 
    type: "+"} */

/* const transactionSchema = joi.object({
    idUser: joi.string().min(24).required(),
    description: joi.string().required,
    value: joi.number().required,
    type: joi.string().valid("+","-").required,
}) */

//Conexão com o mongodb

//Nao funciona o import do .env
//const mongoClient = new MongoClient(process.env.MONGO_URI);

const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;
mongoClient.connect().then(() => {
  db = mongoClient.db("mywallet");
});

// Users - Route

app.get("/users", async (req,res) =>{

    try{

        const users = await db.collection("users").find().toArray()
        res.send(users)

    } catch(error) {
        res.status(500).send(error.message)
    }
});

app.post("/users", async (req,res) => {

    const user = {...req.body, password: bcrypt.hashSync(req.body.password, 10)}
    
    try {

        if (user && bcrypt.compareSync(req.body.password, user.password))
        await db.collection("users").insertOne(user);
        res.sendStatus(201)
    } catch (error) {
        res.status(500).send(error.message)
    }
});  

// User - Route

app.post("/user", async (req,res) => {

    const {email, password} = req.body;

    const user = await db.collection("users").findOne({email});

    if (!user){
        res.sendStatus(401)
        return
    }

    const passwordIsValid = bcrypt.compareSync(password, user.password)
    
    try {
        if (!passwordIsValid){
            res.sendStatus(401)
            return
        }

        const token = uuid();

        await db.collection("sessions").insertOne({
            userId: user._id,
            token: token
        });

        res.send(token)

    } catch (error) {
        res.status(500).send(error.message)
    }
});  

// Sessions - Route

app.get("/sessions", async (req,res) => {

    const token = req.headers.token;

    try {

        let idUser = await db.collection("sessions").findOne({token: token})
        idUser = idUser.userId

        const user = await db.collection("users").findOne({_id : idUser})

        if (user===null){
            res.sendStatus(404)
            return
        }

        const transactions = await db.collection("transactions").find({idUser: idUser}).toArray()

        res.send(transactions)

    } catch (error) {
        res.send(error.message)
    }
});

// Transactions - Route

app.get("/transactions", async (req,res) => {

    //Example of header: 
    //user = "631a03226141464d5f549a40"

    const token = req.headers.token;

    try {

        let idUser = await db.collection("sessions").findOne({token: token})

        idUser = idUser.userId

        const user = await db.collection("users").findOne({_id : idUser})

        if (user===null){
            res.sendStatus(404)
            return
        }

        const transactions = await db.collection("transactions").find({idUser: user._id}).toArray()

        res.send(transactions)

    } catch (error) {
        res.send(error.message)
    }
});

app.post("/transactions", async (req,res) => {

    try {

        //Exemplo de body
        /* {
            idUser: "631a03226141464d5f549a40", 
            description: "teste", 
            value: 200, 
            type: "+"
        } */

        const transaction = {
            idUser: req.body.idUser,
            date: dayjs().format("DD/MM/YY"),
            description: req.body.description,
            value: req.body.value,
            type: req.body.type}


        await db.collection("transactions").insertOne(transaction);

        res.send(transaction)

    } catch (error) {
        res.send(error.message)
    }
});

app.listen(5000);