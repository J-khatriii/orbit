import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.disable("x-powered-by");
app.use(requestLogger);
app.use(helmet());
app.use(express.json());
app.use(cors());

app.use(routes);

app.use(notFound);
app.use(errorHandler);

app.get("/", (req, res) => {
  res.json({ message: "Orbit API is running" });
});

export default app;
