import { Router } from "express";
import { prisma } from "./libs/prisma.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "api running" });
});

//spotify auth route
router.get("/auth/spotify/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.status(400).json({ error });
  }
  if (!code) {
    return res.status(400).json({ message: "No code recieved" });
  }
  res.json({ message: "Spotify callback recieved", code });
});

export default router;

//checking prisma working
router.get("/db-check", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});
