import express from "express";
import cors from "cors";
import routes from "./routes.js";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import spotifyRouter from "./modules/spotify/spotify.routes.js";
import transferRouter from "./modules/transfer/transfer.routes.js";

const app = express();

//global middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

//auth route mounting

app.use("/api/auth", authRoutes);
app.use("/api", routes);

//spotify routes
app.use("/api/spotify", spotifyRouter);

//transfer routes
app.use("/api/transfer", transferRouter);

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});
//error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

export default app;
