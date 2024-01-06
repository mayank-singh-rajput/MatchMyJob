const express = require('express')

const router = express.Router();

const { applyUserToCompany, userFetchAppliedJob, companyFetchAppliedJob, updateAppliedJob } = require("../controller/appliedController");

const { Auth } = require("../middleware/user");

router.post("/", applyUserToCompany);

router.get("/user", userFetchAppliedJob);

router.get("/company", companyFetchAppliedJob);

router.put("/", updateAppliedJob);

module.exports = router;