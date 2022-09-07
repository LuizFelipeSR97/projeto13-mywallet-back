import axios from 'axios';
import express from 'express';
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Models or Schemas (JOI)

/* const userSchema = joi.object({
    name: joi.string().required,
    email: joi.string().required,
    password: joi.string().required
})

const transactionSchema = joi.object({
    date: joi.string().required,
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

app.get("/users", async (req, res) => {

    const user = req.body;
  
    const validation = participantSchema.validate(participant, {
      abortEarly: false,
    });
    if (validation.error) {
      const errors = validation.error.details.map((detail) => detail.message);
      res.status(422).send(errors);
      return;
    }
  
    try {
      const participantExists = await db
        .collection("participants")
        .findOne({ name: participant.name });
  
      if (participantExists) {
        res.send(409);
        return;
      }
  
      await db.collection("participants").insertOne({
        name: participant.name,
        lastStatus: Date.now(),
      });
  
      await db.collection("messages").insertOne({
        from: participant.name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss"),
      });
  
      res.send(201);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

app.post("/users", async (req, res) => {
    try {
      const users = await db.collection("users").find().toArray();
      if (!users[0]) {
        res.status(404).send("Não há usuários cadastrados!");
        return;
      }
      res.send(users);
    } catch (error) {
      res.status(500).send(error.message);
    }
});

  

// Transactions - Route

app.listen(5000);