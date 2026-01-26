import express from "express";
import cors from "cors";
import routes from "./routes.js";

const app = express();

//global middleware
app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

export default app;
