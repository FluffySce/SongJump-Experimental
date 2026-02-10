import { Router } from "express";
import { prisma } from "./libs/prisma.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "api running" });
});

export default router;

//checking prisma working
router.get("/db-check", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});
