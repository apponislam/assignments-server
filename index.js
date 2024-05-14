const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();

const port = process.env.PORT || 5000;
app.use(
    cors({
        origin: ["http://localhost:5173", "https://assignmentb9a11.web.app", "https://assignmentb9a11.firebaseapp.com"],
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());

app.get("/", function (req, res) {
    res.send("Assignment server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4bvpsnf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // sameSite: "none",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

const logger = async (req, res, next) => {
    console.log("called", req.host, req.originalUrl);
    next();
};

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: "Unauthorized Access No Token" });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Token Expired" });
        }
        console.log(decoded);
        req.user = decoded;
        next();
    });
};

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // JWT Token Generate

        app.post("/jwt", logger, async (req, res) => {
            const user = req.body;
            console.log("user for token", user);
            // const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1hr" });
            // res.send(token);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
            res.cookie("token", token, cookieOptions).send({ success: true });
        });

        app.post("/logout", async (req, res) => {
            const user = req.body;
            console.log("logging out", user);
            res.clearCookie("token", { ...cookieOptions, maxAge: 0 }).send({ success: true });
        });

        const assignments = client.db("AssignmentsDB").collection("assignments");

        app.get("/assignments", async (req, res) => {
            const cursor = assignments.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        app.post("/assignments", async (req, res) => {
            const assignment = req.body;
            const result = await assignments.insertOne(assignment);
            res.send(result);
        });

        app.get("/assignments/:id", async (req, res) => {
            const id = req.params.id;
            const result = await assignments.findOne({ _id: new ObjectId(id) });
            if (!result) {
                return res.send("Document not found");
            }
            res.send(result);
        });

        // app.get("/assignments/email/:email", async (req, res) => {
        //     const { email } = req.params;
        //     const query = { useremail: email };
        //     const cursor = assignments.find(query);
        //     const result = await cursor.toArray();
        //     res.send(result);
        // });

        app.put("/assignments/:id", async (req, res) => {
            const id = req.params.id;
            const newDetails = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedArt = {
                $set: {
                    title: newDetails.newTitle,
                    marks: newDetails.newMark,
                    image: newDetails.newImage,
                    description: newDetails.newDescription,
                    startDate: newDetails.newDate,
                    deficulty: newDetails.newDificult,
                },
            };
            const result = await assignments.updateOne(filter, updatedArt, options);
            res.send(result);
        });

        app.delete("/assignments/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await assignments.deleteOne(query);
            res.send(result);
        });

        // Submitted Assignments

        const submittedAssignment = client.db("AssignmentsDB").collection("submittedAssignments");

        app.get("/submitted", logger, verifyToken, async (req, res) => {
            console.log("Valid User", req.user);
            console.log(req.query.email, req.user.email);
            if (req.query.email !== req.user.email) {
                return res.status(403).send({ message: "Forbidden Access" });
            }
            let query = {};
            if (req.query.email) {
                query = { examineeEmail: req.query.email };
            }
            const result = await submittedAssignment.find(query).toArray();
            res.send(result);
        });

        app.get("/submitted/:id", async (req, res) => {
            const id = req.params.id;
            const result = await submittedAssignment.findOne({ _id: new ObjectId(id) });
            if (!result) {
                return res.send("Document not found");
            }
            res.send(result);
        });

        app.put("/submitted/:id", async (req, res) => {
            const id = req.params.id;
            const newMarks = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedArt = {
                $set: {
                    yougot: newMarks.yougot,
                    feedback: newMarks.feedback,
                    status: newMarks.status,
                },
            };
            const result = await submittedAssignment.updateOne(filter, updatedArt, options);
            res.send(result);
        });

        app.get("/submitted/status/true", async (req, res) => {
            const query = { status: true };
            const result = await submittedAssignment.find(query).toArray();
            res.send(result);
        });

        app.get("/submitted/status/false", async (req, res) => {
            const query = { status: false };
            const result = await submittedAssignment.find(query).toArray();
            res.send(result);
        });

        app.post("/submitted", async (req, res) => {
            const submitAssign = req.body;
            console.log(submitAssign);
            const result = await submittedAssignment.insertOne(submitAssign);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Port is running on ${port}`);
});
