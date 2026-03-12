import { Router } from "express";
import authRouter from "@/modules/auth/auth.router";
import tenantRouter from "@/modules/tenant/tenant.router";
import adminRouter from "@/modules/admin/admin.router";

const router = Router();

router.use(adminRouter);
router.use(authRouter);
router.use(tenantRouter);

export default router;
