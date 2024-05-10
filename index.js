const express = require("express");
const cors = require("cors");
const app = express();

const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

app.get("/", function (req, res) {
    res.send("Assignment server is running");
});

app.listen(port, () => {
    console.log(`Port is running on ${port}`);
});
