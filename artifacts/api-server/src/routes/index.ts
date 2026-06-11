import { Router, type IRouter } from "express";
import healthRouter from "./health";
import uploadRouter from "./upload";
import sessionRouter from "./session";
import exportRouter from "./export";

const router: IRouter = Router();

router.use(healthRouter);
router.use(uploadRouter);
router.use(sessionRouter);
router.use(exportRouter);

export default router;
