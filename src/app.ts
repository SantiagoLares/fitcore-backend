import "dotenv/config";
import express from "express";
import cors from "cors";
import { sendSuccess } from "./http/response.js";
import { errorHandler, notFound } from "./http/error-handler.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  }),
);

app.use(express.json());

const apiRouter = express.Router();

apiRouter.get("/health", (_req, res) => {
  return sendSuccess(res, {
    status: "ok",
    service: "fitcore-backend",
  });
});



app.use("/api/v1", apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;