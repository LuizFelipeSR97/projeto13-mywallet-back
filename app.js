import axios from 'axios';
import cors from "cors";
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

const app = express();

app.use(cors());
app.use(express.json());

// Models of Schemas (JOI)

//user:

/* {
    name : "john", 
    email : "john@driven.com", 
    password : "johndriven" 
} */

const userSchema = joi.object({
    name: joi.string().required,
    email: joi.string().email().required,
    password: joi.string().required
})

//transaction:

/* {
    idUser: "631a03226141464d5f549a40", 
    description: "teste", 
    value: 200, 
    type: "+"} */

const transactionSchema = joi.object({
    idUser: joi.string().required(),
    description: joi.string().required,
    value: joi.number().required,
    type: joi.string().valid("+","-").required,
})

//session:

/* {
    email : "john@driven.com", 
    password : "johndriven" 
} */

/* const userSchema = joi.object({
    email: joi.string().required,
    password: joi.string().required
}) */

const mongoClient = new MongoClient(process.env.MONGO_URI);
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

// Sessions Route

app.post("/sessions", async (req,res) => {

    //Vai apagar a ultima sessao que foi iniciada, ficando vazia colecao sessions

    await db.collection("sessions").deleteOne({})

    //Vai procurar se o email do login e a senha batem com o bd

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


        //Se bater, vai criar um objeto em sessions contendo o id do usuario e o token

        const token = uuid();

        await db.collection("sessions").insertOne({
            userId: user._id,
            token: token
        });


        //Vai retornar o token pro front

        res.send(token)

    } catch (error) {
        res.status(500).send(error.message)
    }
});  

app.get("/sessions", async (req,res) => {

    try {

        // Vai procurar o id em sessions

        const user = await db.collection("sessions").find().toArray()

        const idUser = user[0].userId
        const token = user[0].token

        // Vai procurar o nome pelo id em users

        let name = await db.collection("users").find({_id: idUser}).toArray()
        name=name[0].name

        // Vai retornar um objeto contendo o id e o nome do usuario

        res.send({id: idUser, name: name, token: token})

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

        const transactions = await db.collection("transactions").find({idUser: (user._id).toString()}).toArray()

        res.send(transactions)

    } catch (error) {
        res.send(error.message)
    }
});

app.post("/transactions", async (req,res) => {

    const transaction = {
        idUser: req.body.idUser,
        date: dayjs().format("DD/MM/YY"),
        description: req.body.description,
        value: req.body.value,
        type: req.body.type}

    try {

        if (transaction===null){
            res.sendStatus(404)
            return
        }        

        //Exemplo de body
        /* {
            idUser: "631a03226141464d5f549a40", 
            description: "teste", 
            value: 200, 
            type: "+"
        } */
        
        await db.collection("transactions").insertOne(transaction);

        res.send(transaction)

    } catch (error) {
        res.send(error.message)
    }
});

app.listen(5000);